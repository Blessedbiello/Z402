"""Transactions resource"""

from typing import TYPE_CHECKING, List

from z402.models.transaction import (
    ListTransactionsParams,
    ListTransactionsResponse,
    RefundParams,
    Transaction,
)

if TYPE_CHECKING:
    from z402.utils.http import AsyncHTTPClient


class TransactionsResource:
    """
    Transactions API resource.

    Provides methods for listing, retrieving, and managing transactions.
    """

    def __init__(self, http: "AsyncHTTPClient") -> None:
        self._http = http

    async def list(
        self, params: ListTransactionsParams | None = None
    ) -> ListTransactionsResponse:
        """
        List transactions.

        Args:
            params: Query parameters

        Returns:
            Transactions list with pagination info

        Example:
            ```python
            response = await client.transactions.list(
                ListTransactionsParams(
                    limit=100,
                    status=TransactionStatus.SETTLED,
                    date_from="2025-01-01"
                )
            )

            for tx in response.transactions:
                print(f"{tx.id}: {tx.amount} ZEC")
            ```
        """
        query = params.model_dump(by_alias=True, exclude_none=True) if params else {}
        data = await self._http.get("/transactions", query=query)
        return ListTransactionsResponse(**data)

    async def get(self, transaction_id: str) -> Transaction:
        """
        Get a specific transaction.

        Args:
            transaction_id: Transaction ID

        Returns:
            Transaction details

        Example:
            ```python
            tx = await client.transactions.get("tx_...")
            print(tx.status, tx.amount)
            ```
        """
        data = await self._http.get(f"/transactions/{transaction_id}")
        return Transaction(**data)

    async def refund(
        self, transaction_id: str, params: RefundParams | None = None
    ) -> Transaction:
        """
        Issue a refund for a transaction.

        Args:
            transaction_id: Transaction ID
            params: Refund parameters

        Returns:
            Updated transaction

        Example:
            ```python
            await client.transactions.refund(
                "tx_...",
                RefundParams(reason="Customer requested refund")
            )
            ```
        """
        body = params.model_dump(by_alias=True) if params else {}
        data = await self._http.post(f"/transactions/{transaction_id}/refund", body=body)
        return Transaction(**data)

    async def export_csv(self, params: ListTransactionsParams | None = None) -> str:
        """
        Export transactions to CSV.

        Args:
            params: Query parameters

        Returns:
            CSV string

        Example:
            ```python
            csv = await client.transactions.export_csv(
                ListTransactionsParams(
                    date_from="2025-01-01",
                    date_to="2025-01-31"
                )
            )

            with open("transactions.csv", "w") as f:
                f.write(csv)
            ```
        """
        query = params.model_dump(by_alias=True, exclude_none=True) if params else {}
        data = await self._http.get("/transactions/export/csv", query=query)
        return data["csv"]

    async def export_json(self, params: ListTransactionsParams | None = None) -> List[Transaction]:
        """
        Export transactions to JSON.

        Args:
            params: Query parameters

        Returns:
            List of transactions

        Example:
            ```python
            transactions = await client.transactions.export_json(
                ListTransactionsParams(status=TransactionStatus.SETTLED)
            )
            ```
        """
        query = params.model_dump(by_alias=True, exclude_none=True) if params else {}
        data = await self._http.get("/transactions/export/json", query=query)
        return [Transaction(**tx) for tx in data["transactions"]]
