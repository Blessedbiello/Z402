"""Z402 SDK Client"""

from typing import Literal, Optional

from z402.resources.payments import PaymentsResource
from z402.resources.transactions import TransactionsResource
from z402.resources.webhooks import WebhooksResource
from z402.utils.budget import BudgetManager
from z402.utils.http import AsyncHTTPClient


class Z402Client:
    """
    Z402 SDK client for async operations.

    Optimized for AI agents and automation scripts with built-in budget
    management, async/await support, and automatic retries.

    Args:
        api_key: Your Z402 API key (must start with 'z402_')
        network: Network to use ('testnet' or 'mainnet')
        base_url: Optional custom API URL
        max_retries: Maximum retry attempts (default: 3)
        timeout: Request timeout in seconds (default: 30)
        debug: Enable debug logging (default: False)
        budget_manager: Optional budget manager for spending limits

    Example:
        ```python
        import asyncio
        from z402 import Z402Client, BudgetManager

        async def main():
            # Basic usage
            client = Z402Client(
                api_key="z402_test_...",
                network="testnet"
            )

            # With budget management for AI agents
            budget = BudgetManager(daily_limit="1.0", hourly_limit="0.1")
            client = Z402Client(
                api_key="z402_test_...",
                network="testnet",
                budget_manager=budget
            )

            async with client:
                # Create payment
                intent = await client.payments.create(
                    CreatePaymentIntentParams(
                        amount="0.01",
                        resource="/api/data"
                    )
                )

                # Get budget stats
                stats = await client.budget.get_statistics()
                print(stats)

        asyncio.run(main())
        ```
    """

    def __init__(
        self,
        api_key: str,
        network: Literal["testnet", "mainnet"] = "testnet",
        base_url: Optional[str] = None,
        max_retries: int = 3,
        timeout: int = 30,
        debug: bool = False,
        budget_manager: Optional[BudgetManager] = None,
    ) -> None:
        if not api_key:
            raise ValueError("API key is required")

        if not api_key.startswith("z402_"):
            raise ValueError("Invalid API key format. API keys should start with 'z402_'")

        # Determine base URL
        if base_url is None:
            base_url = (
                "https://api.z402.io/v1"
                if network == "mainnet"
                else "https://api-testnet.z402.io/v1"
            )

        # Initialize HTTP client
        self._http = AsyncHTTPClient(
            api_key=api_key,
            base_url=base_url,
            max_retries=max_retries,
            timeout=timeout,
            debug=debug,
        )

        # Initialize resources
        self.payments = PaymentsResource(self._http)
        self.transactions = TransactionsResource(self._http)
        self.webhooks = WebhooksResource(self._http)

        # Optional budget manager
        self.budget = budget_manager

    async def __aenter__(self) -> "Z402Client":
        """Async context manager entry"""
        await self._http.__aenter__()
        return self

    async def __aexit__(self, exc_type: any, exc_val: any, exc_tb: any) -> None:
        """Async context manager exit"""
        await self._http.__aexit__(exc_type, exc_val, exc_tb)

    async def close(self) -> None:
        """Close the client and cleanup resources"""
        await self._http.close()

    async def pay(
        self,
        amount: str,
        resource: str,
        from_address: str,
        tx_id: str,
        metadata: Optional[dict] = None,
        check_budget: bool = True,
    ) -> any:
        """
        Convenience method to create and pay for a resource in one call.

        Useful for AI agents that need to autonomously pay for API access.

        Args:
            amount: Amount in ZEC
            resource: Resource URL
            from_address: Sender's Zcash address
            tx_id: Transaction ID on Zcash blockchain
            metadata: Optional metadata
            check_budget: Check budget before payment (default: True)

        Returns:
            Payment intent

        Raises:
            BudgetExceededError: If budget check fails

        Example:
            ```python
            # AI agent autonomous payment
            payment = await client.pay(
                amount="0.01",
                resource="/api/premium/data",
                from_address="zs1...",
                tx_id="...",
                metadata={"agent_id": "research-bot-1"}
            )

            # Use payment proof to access resource
            response = await aiohttp.get(
                resource,
                headers={"z402-payment-intent": payment.id}
            )
            ```
        """
        from z402.models.payment import CreatePaymentIntentParams, PaymentParams

        # Check budget if enabled
        if check_budget and self.budget:
            if not await self.budget.can_spend(amount):
                raise ValueError("Spending would exceed budget limits")

        # Create payment intent
        intent = await self.payments.create(
            CreatePaymentIntentParams(
                amount=amount,
                resource=resource,
                metadata=metadata,
            )
        )

        # Submit payment
        paid = await self.payments.pay(
            intent.id,
            PaymentParams(from_address=from_address, tx_id=tx_id),
        )

        # Record in budget if enabled
        if self.budget:
            await self.budget.record_spend(amount, paid.id, metadata)

        return paid
