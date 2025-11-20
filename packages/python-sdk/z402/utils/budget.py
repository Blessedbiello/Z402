"""Budget management for AI agents"""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from z402.exceptions import BudgetExceededError


class BudgetManager:
    """
    Budget manager for tracking and limiting spending.

    Useful for AI agents to autonomously manage payment budgets.

    Args:
        daily_limit: Daily spending limit in ZEC
        hourly_limit: Optional hourly spending limit
        transaction_limit: Optional per-transaction limit

    Example:
        ```python
        budget = BudgetManager(
            daily_limit="1.0",
            hourly_limit="0.1",
            transaction_limit="0.01"
        )

        # Check before payment
        if await budget.can_spend("0.005"):
            payment = await client.pay(...)
            await budget.record_spend("0.005", payment.id)
        else:
            print("Budget limit exceeded")
        ```
    """

    def __init__(
        self,
        daily_limit: str,
        hourly_limit: Optional[str] = None,
        transaction_limit: Optional[str] = None,
    ) -> None:
        self.daily_limit = Decimal(daily_limit)
        self.hourly_limit = Decimal(hourly_limit) if hourly_limit else None
        self.transaction_limit = Decimal(transaction_limit) if transaction_limit else None

        self._lock = asyncio.Lock()
        self._transactions: List[Dict[str, any]] = []

    async def can_spend(self, amount: str) -> bool:
        """
        Check if spending amount is within budget.

        Args:
            amount: Amount to spend in ZEC

        Returns:
            True if within budget limits
        """
        spend_amount = Decimal(amount)

        # Check transaction limit
        if self.transaction_limit and spend_amount > self.transaction_limit:
            return False

        async with self._lock:
            now = datetime.now()

            # Calculate daily spending
            daily_start = now - timedelta(days=1)
            daily_spent = sum(
                Decimal(tx["amount"])
                for tx in self._transactions
                if tx["timestamp"] >= daily_start
            )

            if daily_spent + spend_amount > self.daily_limit:
                return False

            # Calculate hourly spending (if limit set)
            if self.hourly_limit:
                hourly_start = now - timedelta(hours=1)
                hourly_spent = sum(
                    Decimal(tx["amount"])
                    for tx in self._transactions
                    if tx["timestamp"] >= hourly_start
                )

                if hourly_spent + spend_amount > self.hourly_limit:
                    return False

            return True

    async def record_spend(
        self,
        amount: str,
        transaction_id: str,
        metadata: Optional[Dict[str, any]] = None,
    ) -> None:
        """
        Record a spending transaction.

        Args:
            amount: Amount spent in ZEC
            transaction_id: Transaction ID
            metadata: Optional metadata

        Raises:
            BudgetExceededError: If spending would exceed limits
        """
        if not await self.can_spend(amount):
            raise BudgetExceededError(
                "Spending would exceed budget limits",
                limit=str(self.daily_limit),
                current=str(await self.get_daily_spent()),
            )

        async with self._lock:
            self._transactions.append({
                "amount": amount,
                "transaction_id": transaction_id,
                "timestamp": datetime.now(),
                "metadata": metadata or {},
            })

    async def get_daily_spent(self) -> Decimal:
        """
        Get total spending in the last 24 hours.

        Returns:
            Total amount spent
        """
        async with self._lock:
            now = datetime.now()
            daily_start = now - timedelta(days=1)

            return sum(
                Decimal(tx["amount"])
                for tx in self._transactions
                if tx["timestamp"] >= daily_start
            )

    async def get_hourly_spent(self) -> Decimal:
        """
        Get total spending in the last hour.

        Returns:
            Total amount spent
        """
        async with self._lock:
            now = datetime.now()
            hourly_start = now - timedelta(hours=1)

            return sum(
                Decimal(tx["amount"])
                for tx in self._transactions
                if tx["timestamp"] >= hourly_start
            )

    async def get_remaining_daily(self) -> Decimal:
        """
        Get remaining daily budget.

        Returns:
            Remaining amount
        """
        return self.daily_limit - await self.get_daily_spent()

    async def get_remaining_hourly(self) -> Optional[Decimal]:
        """
        Get remaining hourly budget.

        Returns:
            Remaining amount (None if no hourly limit)
        """
        if not self.hourly_limit:
            return None
        return self.hourly_limit - await self.get_hourly_spent()

    async def get_transaction_history(
        self, hours: int = 24
    ) -> List[Dict[str, any]]:
        """
        Get transaction history for the specified time period.

        Args:
            hours: Number of hours to look back

        Returns:
            List of transactions
        """
        async with self._lock:
            cutoff = datetime.now() - timedelta(hours=hours)
            return [
                tx
                for tx in self._transactions
                if tx["timestamp"] >= cutoff
            ]

    async def reset_history(self) -> None:
        """Clear transaction history"""
        async with self._lock:
            self._transactions.clear()

    async def get_statistics(self) -> Dict[str, any]:
        """
        Get budget statistics.

        Returns:
            Dictionary with budget stats
        """
        daily_spent = await self.get_daily_spent()
        hourly_spent = await self.get_hourly_spent()

        stats = {
            "daily_limit": str(self.daily_limit),
            "daily_spent": str(daily_spent),
            "daily_remaining": str(self.daily_limit - daily_spent),
            "daily_usage_percent": float((daily_spent / self.daily_limit) * 100),
        }

        if self.hourly_limit:
            stats.update({
                "hourly_limit": str(self.hourly_limit),
                "hourly_spent": str(hourly_spent),
                "hourly_remaining": str(self.hourly_limit - hourly_spent),
                "hourly_usage_percent": float((hourly_spent / self.hourly_limit) * 100),
            })

        if self.transaction_limit:
            stats["transaction_limit"] = str(self.transaction_limit)

        return stats
