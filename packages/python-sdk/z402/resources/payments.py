"""Payments resource"""

from typing import TYPE_CHECKING

from z402.models.payment import CreatePaymentIntentParams, PaymentIntent, PaymentParams

if TYPE_CHECKING:
    from z402.utils.http import AsyncHTTPClient


class PaymentsResource:
    """
    Payments API resource.

    Provides methods for creating, retrieving, and managing payment intents.
    """

    def __init__(self, http: "AsyncHTTPClient") -> None:
        self._http = http

    async def create(self, params: CreatePaymentIntentParams) -> PaymentIntent:
        """
        Create a payment intent.

        Args:
            params: Payment intent parameters

        Returns:
            Created payment intent

        Example:
            ```python
            intent = await client.payments.create(
                CreatePaymentIntentParams(
                    amount="0.01",
                    resource="/api/premium/data",
                    metadata={"user_id": "123"}
                )
            )
            ```
        """
        data = await self._http.post("/payment-intents", body=params.model_dump(by_alias=True))
        return PaymentIntent(**data)

    async def get(self, payment_id: str) -> PaymentIntent:
        """
        Get a payment intent by ID.

        Args:
            payment_id: Payment intent ID

        Returns:
            Payment intent

        Example:
            ```python
            intent = await client.payments.get("pi_...")
            ```
        """
        data = await self._http.get(f"/payment-intents/{payment_id}")
        return PaymentIntent(**data)

    async def pay(self, payment_id: str, params: PaymentParams) -> PaymentIntent:
        """
        Submit payment for a payment intent.

        Args:
            payment_id: Payment intent ID
            params: Payment parameters

        Returns:
            Updated payment intent

        Example:
            ```python
            payment = await client.payments.pay(
                "pi_...",
                PaymentParams(from_address="zs1...", tx_id="...")
            )
            ```
        """
        data = await self._http.post(
            f"/payment-intents/{payment_id}/pay",
            body=params.model_dump(by_alias=True)
        )
        return PaymentIntent(**data)

    async def verify(self, payment_id: str) -> PaymentIntent:
        """
        Verify a payment.

        Args:
            payment_id: Payment intent ID

        Returns:
            Verified payment intent with settlement status

        Example:
            ```python
            verified = await client.payments.verify("pi_...")
            if verified.status == PaymentStatus.SETTLED:
                # Grant access to resource
                pass
            ```
        """
        data = await self._http.get(f"/payment-intents/{payment_id}/verify")
        return PaymentIntent(**data)

    async def cancel(self, payment_id: str) -> PaymentIntent:
        """
        Cancel a payment intent.

        Args:
            payment_id: Payment intent ID

        Returns:
            Cancelled payment intent

        Example:
            ```python
            await client.payments.cancel("pi_...")
            ```
        """
        data = await self._http.post(f"/payment-intents/{payment_id}/cancel")
        return PaymentIntent(**data)
