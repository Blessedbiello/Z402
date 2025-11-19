"""
Z402 CLI Tool

Command-line interface for testing and managing Z402 payments.
"""

import asyncio
import os
from decimal import Decimal
from typing import Optional

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from z402 import (
    BudgetManager,
    CreatePaymentIntentParams,
    ListTransactionsParams,
    Z402Client,
)

# Load environment variables
load_dotenv()

app = typer.Typer(
    name="z402",
    help="Z402 SDK CLI - Test and manage Zcash payments",
    add_completion=False,
)
console = Console()


def get_client(
    api_key: Optional[str] = None,
    network: str = "testnet",
) -> Z402Client:
    """Get Z402 client instance"""
    key = api_key or os.getenv("Z402_API_KEY")
    if not key:
        console.print("[red]Error: Z402_API_KEY not found in environment[/red]")
        raise typer.Exit(1)

    return Z402Client(api_key=key, network=network, debug=True)  # type: ignore


@app.command()
def create_payment(
    amount: str = typer.Option(..., "--amount", "-a", help="Amount in ZEC"),
    resource: str = typer.Option(..., "--resource", "-r", help="Resource URL"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Z402 API key"),
    network: str = typer.Option("testnet", "--network", "-n", help="Network (testnet/mainnet)"),
):
    """Create a new payment intent"""

    async def run():
        async with get_client(api_key, network) as client:
            intent = await client.payments.create(
                CreatePaymentIntentParams(amount=amount, resource=resource)
            )

            table = Table(title="Payment Intent Created")
            table.add_column("Field", style="cyan")
            table.add_column("Value", style="green")

            table.add_row("ID", intent.id)
            table.add_row("Amount", f"{intent.amount} ZEC")
            table.add_row("Resource", intent.resource)
            table.add_row("Status", intent.status.value)
            table.add_row("Zcash Address", intent.zcash_address)
            table.add_row("Expires At", str(intent.expires_at))

            console.print(table)

    asyncio.run(run())


@app.command()
def get_payment(
    payment_id: str = typer.Argument(..., help="Payment intent ID"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Z402 API key"),
    network: str = typer.Option("testnet", "--network", "-n", help="Network"),
):
    """Get payment intent details"""

    async def run():
        async with get_client(api_key, network) as client:
            intent = await client.payments.get(payment_id)

            console.print(Panel.fit(
                f"[bold]Payment Intent[/bold]\n\n"
                f"ID: {intent.id}\n"
                f"Amount: {intent.amount} ZEC\n"
                f"Resource: {intent.resource}\n"
                f"Status: {intent.status.value}\n"
                f"Address: {intent.zcash_address}",
                title="Payment Details",
            ))

    asyncio.run(run())


@app.command()
def list_transactions(
    limit: int = typer.Option(10, "--limit", "-l", help="Number of transactions"),
    status: Optional[str] = typer.Option(None, "--status", "-s", help="Filter by status"),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Z402 API key"),
    network: str = typer.Option("testnet", "--network", "-n", help="Network"),
):
    """List transactions"""

    async def run():
        async with get_client(api_key, network) as client:
            params = ListTransactionsParams(limit=limit)
            if status:
                params.status = status  # type: ignore

            response = await client.transactions.list(params)

            table = Table(title=f"Transactions ({response.total} total)")
            table.add_column("ID", style="cyan")
            table.add_column("Amount", style="green")
            table.add_column("Status", style="yellow")
            table.add_column("Resource", style="blue")

            for tx in response.transactions:
                table.add_row(
                    tx.id[:12] + "...",
                    f"{tx.amount} {tx.currency}",
                    tx.status.value,
                    tx.resource_url[:30] + "..." if len(tx.resource_url) > 30 else tx.resource_url,
                )

            console.print(table)

    asyncio.run(run())


@app.command()
def budget_stats(
    daily_limit: str = typer.Option("1.0", "--daily-limit", help="Daily limit in ZEC"),
    hourly_limit: Optional[str] = typer.Option(None, "--hourly-limit", help="Hourly limit in ZEC"),
):
    """Show budget statistics (demo)"""

    async def run():
        budget = BudgetManager(
            daily_limit=daily_limit,
            hourly_limit=hourly_limit,
        )

        # Simulate some spending
        await budget.record_spend("0.05", "tx_demo_1")
        await budget.record_spend("0.03", "tx_demo_2")
        await budget.record_spend("0.02", "tx_demo_3")

        stats = await budget.get_statistics()

        table = Table(title="Budget Statistics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Daily Limit", f"{stats['daily_limit']} ZEC")
        table.add_row("Daily Spent", f"{stats['daily_spent']} ZEC")
        table.add_row("Daily Remaining", f"{stats['daily_remaining']} ZEC")
        table.add_row("Usage", f"{stats['daily_usage_percent']:.1f}%")

        if "hourly_limit" in stats:
            table.add_row("", "")  # Separator
            table.add_row("Hourly Limit", f"{stats['hourly_limit']} ZEC")
            table.add_row("Hourly Spent", f"{stats['hourly_spent']} ZEC")
            table.add_row("Hourly Remaining", f"{stats['hourly_remaining']} ZEC")

        console.print(table)

        # Show transaction history
        history = await budget.get_transaction_history()
        console.print(f"\n[bold]Transaction History:[/bold] {len(history)} transactions")

    asyncio.run(run())


@app.command()
def webhook_config(
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Z402 API key"),
    network: str = typer.Option("testnet", "--network", "-n", help="Network"),
):
    """Get webhook configuration"""

    async def run():
        async with get_client(api_key, network) as client:
            config = await client.webhooks.get()

            console.print(Panel.fit(
                f"[bold]Webhook Configuration[/bold]\n\n"
                f"URL: {config.url}\n"
                f"Secret: {config.secret[:10]}...\n"
                f"Events: {', '.join(config.events)}\n"
                f"Enabled: {config.enabled}",
                title="Webhook Config",
            ))

    asyncio.run(run())


@app.command()
def version():
    """Show SDK version"""
    from z402 import __version__

    console.print(Panel.fit(
        f"[bold cyan]Z402 Python SDK[/bold cyan]\n"
        f"Version: {__version__}\n"
        f"Optimized for AI agents and automation",
        title="SDK Info",
    ))


if __name__ == "__main__":
    app()
