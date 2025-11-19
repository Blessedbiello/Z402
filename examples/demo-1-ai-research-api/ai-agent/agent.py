"""
AI Research Agent - Autonomous API Consumer

This agent autonomously pays for premium research data using Z402.
It demonstrates budget management, decision-making, and autonomous payments.
"""

import asyncio
import os
from decimal import Decimal
from typing import Dict, Any

import aiohttp
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from z402 import Z402Client, BudgetManager, CreatePaymentIntentParams, PaymentRequiredError

load_dotenv()

console = Console()

class AIResearchAgent:
    """
    Autonomous AI agent that pays for research data using Z402.

    Features:
    - Budget management (daily/hourly limits)
    - Autonomous decision-making
    - Cost-benefit analysis
    - Transaction tracking
    """

    def __init__(
        self,
        api_url: str = "http://localhost:3000",
        daily_budget: str = "0.1",  # 0.1 ZEC per day
        hourly_budget: str = "0.05",  # 0.05 ZEC per hour
    ):
        self.api_url = api_url
        self.session: aiohttp.ClientSession | None = None

        # Initialize budget manager
        self.budget = BudgetManager(
            daily_limit=daily_budget,
            hourly_limit=hourly_budget,
            transaction_limit="0.02",  # Max 0.02 per transaction
        )

        # Initialize Z402 client
        self.z402 = Z402Client(
            api_key=os.getenv("Z402_API_KEY", ""),
            network="testnet",
            budget_manager=self.budget,
            debug=True,
        )

        # Track research results
        self.research_results: list[Dict[str, Any]] = []

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        await self.z402.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        await self.z402.__aexit__(exc_type, exc_val, exc_tb)

    async def get_available_endpoints(self) -> Dict[str, Any]:
        """Get information about available research endpoints"""
        async with self.session.get(f"{self.api_url}/api/info") as response:
            return await response.json()

    async def fetch_research_data(
        self,
        endpoint: str,
        max_willing_to_pay: str = "0.02",
    ) -> Dict[str, Any] | None:
        """
        Fetch research data from a paid endpoint.

        The agent autonomously decides whether to pay based on:
        - Available budget
        - Cost vs max willing to pay
        - Research priority
        """
        url = f"{self.api_url}{endpoint}"

        console.print(f"\n[cyan]→ Requesting:[/cyan] {endpoint}")

        try:
            # Try to access the resource
            async with self.session.get(url) as response:
                if response.status == 402:
                    # Payment required
                    payment_info = await response.json()
                    required_amount = payment_info.get("payment", {}).get("amount")

                    console.print(
                        f"[yellow]💰 Payment required:[/yellow] {required_amount} ZEC"
                    )

                    # Decision-making: Is it worth paying?
                    if Decimal(required_amount) > Decimal(max_willing_to_pay):
                        console.print(
                            f"[red]✗ Cost too high[/red] (max: {max_willing_to_pay} ZEC)"
                        )
                        return None

                    # Check budget
                    if not await self.budget.can_spend(required_amount):
                        stats = await self.budget.get_statistics()
                        console.print(
                            f"[red]✗ Budget exceeded[/red] "
                            f"(spent: {stats['daily_spent']}/{stats['daily_limit']} ZEC)"
                        )
                        return None

                    # Agent approves payment
                    console.print(f"[green]✓ Approved[/green] - Paying {required_amount} ZEC...")

                    # Create payment intent
                    intent = await self.z402.payments.create(
                        CreatePaymentIntentParams(
                            amount=required_amount,
                            resource=endpoint,
                            metadata={"agent": "research-bot", "endpoint": endpoint},
                        )
                    )

                    console.print(f"[dim]Payment intent: {intent.id}[/dim]")

                    # In production, agent would:
                    # 1. Send Zcash to intent.zcash_address
                    # 2. Get transaction ID
                    # 3. Submit payment with tx ID

                    # For demo, we'll simulate by using the payment intent ID
                    # In reality, the endpoint would verify the actual blockchain transaction

                    # Record spend in budget
                    await self.budget.record_spend(
                        required_amount,
                        intent.id,
                        metadata={"endpoint": endpoint},
                    )

                    # Retry with payment intent header (simulated payment proof)
                    headers = {"z402-payment-intent": intent.id}
                    async with self.session.get(url, headers=headers) as paid_response:
                        if paid_response.status == 200:
                            data = await paid_response.json()
                            console.print(
                                f"[green]✓ Data received[/green] ({len(str(data))} bytes)"
                            )

                            # Store result
                            self.research_results.append({
                                "endpoint": endpoint,
                                "cost": required_amount,
                                "timestamp": intent.created_at,
                                "data": data,
                            })

                            return data
                        else:
                            console.print(
                                f"[red]✗ Payment verification failed[/red] ({paid_response.status})"
                            )
                            return None

                elif response.status == 200:
                    # Free resource
                    data = await response.json()
                    console.print(f"[green]✓ Free data received[/green]")
                    return data

                else:
                    console.print(f"[red]✗ Error {response.status}[/red]")
                    return None

        except Exception as e:
            console.print(f"[red]✗ Error:[/red] {str(e)}")
            return None

    async def run_research_cycle(self):
        """Run a complete research cycle, fetching data from multiple endpoints"""
        console.print(
            Panel.fit(
                "[bold cyan]AI Research Agent[/bold cyan]\n"
                "Autonomous data acquisition with Z402 budget management",
                title="🤖 Agent Starting",
            )
        )

        # Show initial budget
        stats = await self.budget.get_statistics()
        console.print(
            f"\n[cyan]Budget:[/cyan] {stats['daily_spent']}/{stats['daily_limit']} ZEC used"
        )

        # Get available endpoints
        info = await self.get_available_endpoints()
        console.print(f"\n[cyan]Available endpoints:[/cyan] {len(info['endpoints'])}")

        # Research priority queue (endpoints to fetch)
        research_queue = [
            {
                "endpoint": "/api/research/market-trends",
                "priority": "high",
                "max_cost": "0.015",
            },
            {
                "endpoint": "/api/research/sentiment-analysis",
                "priority": "high",
                "max_cost": "0.015",
            },
            {
                "endpoint": "/api/research/competitor-analysis",
                "priority": "medium",
                "max_cost": "0.01",
            },
            {
                "endpoint": "/api/research/predictions",
                "priority": "low",
                "max_cost": "0.02",
            },
        ]

        # Execute research
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("[cyan]Fetching research data...", total=len(research_queue))

            for item in research_queue:
                await self.fetch_research_data(item["endpoint"], item["max_cost"])
                progress.update(task, advance=1)
                await asyncio.sleep(0.5)  # Rate limiting

        # Show results summary
        await self.show_summary()

    async def show_summary(self):
        """Display research summary and budget status"""
        console.print("\n" + "=" * 60)
        console.print("[bold green]Research Summary[/bold green]")
        console.print("=" * 60 + "\n")

        # Results table
        table = Table(title="Data Acquired")
        table.add_column("Endpoint", style="cyan")
        table.add_column("Cost", style="green", justify="right")
        table.add_column("Status", style="yellow")

        for result in self.research_results:
            table.add_row(
                result["endpoint"],
                f"{result['cost']} ZEC",
                "✓ Success",
            )

        console.print(table)

        # Budget status
        stats = await self.budget.get_statistics()

        budget_table = Table(title="\nBudget Status")
        budget_table.add_column("Metric", style="cyan")
        budget_table.add_column("Value", style="yellow")

        budget_table.add_row("Daily Limit", f"{stats['daily_limit']} ZEC")
        budget_table.add_row("Daily Spent", f"{stats['daily_spent']} ZEC")
        budget_table.add_row("Daily Remaining", f"{stats['daily_remaining']} ZEC")
        budget_table.add_row("Usage", f"{stats['daily_usage_percent']:.1f}%")

        if "hourly_limit" in stats:
            budget_table.add_row("", "")  # Separator
            budget_table.add_row("Hourly Limit", f"{stats['hourly_limit']} ZEC")
            budget_table.add_row("Hourly Spent", f"{stats['hourly_spent']} ZEC")

        console.print(budget_table)

        # Transaction history
        history = await self.budget.get_transaction_history()
        console.print(f"\n[cyan]Total Transactions:[/cyan] {len(history)}")

        for tx in history:
            console.print(
                f"  • {tx['amount']} ZEC - {tx['metadata'].get('endpoint', 'unknown')}"
            )

async def main():
    """Main entry point"""
    console.print(
        Panel.fit(
            "[bold]Z402 AI Research Agent Demo[/bold]\n\n"
            "This agent autonomously pays for premium research data\n"
            "using Z402 micropayments with budget management.",
            title="🤖 Demo 1: AI Research API",
            border_style="cyan",
        )
    )

    # Check environment
    if not os.getenv("Z402_API_KEY"):
        console.print("\n[red]Error:[/red] Z402_API_KEY not set in environment")
        console.print("Set it with: export Z402_API_KEY=z402_test_...")
        return

    # Create and run agent
    async with AIResearchAgent(
        api_url=os.getenv("API_URL", "http://localhost:3000"),
        daily_budget="0.1",
        hourly_budget="0.05",
    ) as agent:
        await agent.run_research_cycle()

    console.print("\n[green]✓ Agent completed successfully[/green]")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Agent stopped by user[/yellow]")
