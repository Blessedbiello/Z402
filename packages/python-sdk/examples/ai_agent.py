"""
AI Research Agent Example

Demonstrates how an AI agent can autonomously manage payments for API access
using Z402 SDK with budget management.
"""

import asyncio
import os
from decimal import Decimal

import aiohttp
from dotenv import load_dotenv

from z402 import (
    BudgetManager,
    CreatePaymentIntentParams,
    PaymentParams,
    PaymentRequiredError,
    Z402Client,
)

load_dotenv()


class AIResearchAgent:
    """
    Autonomous AI agent that can pay for premium API access.

    Features:
    - Budget management to limit spending
    - Automatic payment handling
    - Decision-making based on cost/benefit
    - Transaction tracking
    """

    def __init__(
        self,
        z402_api_key: str,
        daily_budget: str = "1.0",
        hourly_budget: str = "0.1",
        max_per_request: str = "0.01",
    ):
        # Initialize budget manager
        self.budget = BudgetManager(
            daily_limit=daily_budget,
            hourly_limit=hourly_budget,
            transaction_limit=max_per_request,
        )

        # Initialize Z402 client with budget
        self.z402 = Z402Client(
            api_key=z402_api_key,
            network="testnet",
            budget_manager=self.budget,
            debug=True,
        )

        self.wallet_address = os.getenv("ZCASH_ADDRESS", "zs1...")
        self.session: aiohttp.ClientSession | None = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        await self.z402.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        await self.z402.__aexit__(exc_type, exc_val, exc_tb)

    async def fetch_data(self, endpoint: str, max_cost: str = "0.01") -> dict:
        """
        Fetch data from an endpoint, automatically handling payments if required.

        Args:
            endpoint: API endpoint URL
            max_cost: Maximum willing to pay for this request

        Returns:
            API response data
        """
        if not self.session:
            raise RuntimeError("Agent not initialized. Use async with context manager.")

        print(f"\n[Agent] Fetching data from: {endpoint}")

        try:
            # Try to access resource
            response = await self.session.get(endpoint)

            if response.status == 402:
                # Payment required
                payment_info = await response.json()
                required_amount = payment_info.get("payment", {}).get("amount")
                resource = payment_info.get("payment", {}).get("resource")

                print(f"[Agent] Payment required: {required_amount} ZEC")

                # Decision-making: Is it worth paying?
                if Decimal(required_amount) > Decimal(max_cost):
                    print(f"[Agent] Cost too high. Max willing to pay: {max_cost} ZEC")
                    return {"error": "Cost exceeds budget"}

                # Check budget
                if not await self.budget.can_spend(required_amount):
                    budget_stats = await self.budget.get_statistics()
                    print(f"[Agent] Budget exceeded. Daily spent: {budget_stats['daily_spent']} ZEC")
                    return {"error": "Budget limit exceeded"}

                # Make payment
                print(f"[Agent] Approving payment of {required_amount} ZEC...")
                payment = await self._make_payment(required_amount, resource)

                # Retry request with payment proof
                response = await self.session.get(
                    endpoint,
                    headers={"z402-payment-intent": payment.id},
                )

                if response.status == 200:
                    print(f"[Agent] Payment successful! Accessing resource...")
                    await self.budget.record_spend(
                        required_amount,
                        payment.id,
                        metadata={"endpoint": endpoint},
                    )
                    return await response.json()

            elif response.status == 200:
                # Free resource
                print("[Agent] Resource is free")
                return await response.json()

            else:
                print(f"[Agent] Error: {response.status}")
                return {"error": f"HTTP {response.status}"}

        except PaymentRequiredError as e:
            print(f"[Agent] Payment required: {e.amount} ZEC for {e.resource}")
            raise
        except Exception as e:
            print(f"[Agent] Error: {str(e)}")
            return {"error": str(e)}

    async def _make_payment(self, amount: str, resource: str):
        """Make a payment for a resource"""
        # In a real implementation, this would:
        # 1. Create payment intent
        # 2. Generate Zcash transaction
        # 3. Submit payment

        # For demo, we create a payment intent
        intent = await self.z402.payments.create(
            CreatePaymentIntentParams(
                amount=amount,
                resource=resource,
                metadata={"agent": "research-bot"},
            )
        )

        # Simulate payment submission
        # In reality, you'd interact with Zcash wallet here
        print(f"[Agent] Pay {amount} ZEC to: {intent.zcash_address}")
        print(f"[Agent] Payment intent ID: {intent.id}")

        # For demo purposes, we'll simulate the payment
        # In production, you'd do: tx_id = await zcash_wallet.send(...)
        # then: await self.z402.payments.pay(intent.id, PaymentParams(from_address=..., tx_id=...))

        return intent

    async def get_budget_report(self) -> dict:
        """Get current budget status"""
        return await self.budget.get_statistics()

    async def get_transaction_history(self) -> list:
        """Get recent transactions"""
        return await self.budget.get_transaction_history()


async def main():
    """Demo of AI agent autonomous payment handling"""
    api_key = os.getenv("Z402_API_KEY")
    if not api_key:
        print("Error: Z402_API_KEY not set")
        return

    async with AIResearchAgent(
        z402_api_key=api_key,
        daily_budget="1.0",
        hourly_budget="0.1",
        max_per_request="0.05",
    ) as agent:
        print("=" * 60)
        print("AI Research Agent - Autonomous Payment Demo")
        print("=" * 60)

        # Simulate agent making decisions about API access
        endpoints = [
            ("https://api.example.com/free-data", "0.00"),
            ("https://api.example.com/premium-data", "0.01"),
            ("https://api.example.com/expensive-data", "0.10"),
        ]

        for endpoint, max_cost in endpoints:
            result = await agent.fetch_data(endpoint, max_cost)
            print(f"Result: {result}")
            print("-" * 60)

        # Show budget report
        print("\n" + "=" * 60)
        print("Budget Report")
        print("=" * 60)

        stats = await agent.get_budget_report()
        print(f"Daily Limit: {stats['daily_limit']} ZEC")
        print(f"Daily Spent: {stats['daily_spent']} ZEC")
        print(f"Daily Remaining: {stats['daily_remaining']} ZEC")
        print(f"Usage: {stats['daily_usage_percent']:.1f}%")

        # Show transaction history
        history = await agent.get_transaction_history()
        print(f"\nTransactions: {len(history)}")
        for tx in history:
            print(f"  - {tx['amount']} ZEC (ID: {tx['transaction_id'][:12]}...)")


if __name__ == "__main__":
    asyncio.run(main())
