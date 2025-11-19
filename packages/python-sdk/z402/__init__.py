"""
Z402 Python SDK - Optimized for AI Agents and Automation

A developer-friendly async Python SDK for Z402 payment facilitator.
Built with AI agents in mind, featuring budget management, automatic retries,
and comprehensive async/await support.

Example:
    ```python
    import asyncio
    from z402 import Z402Client, BudgetManager, CreatePaymentIntentParams

    async def main():
        # Initialize client with budget management
        budget = BudgetManager(daily_limit="1.0", hourly_limit="0.1")

        async with Z402Client(
            api_key="z402_test_...",
            network="testnet",
            budget_manager=budget
        ) as client:
            # Create payment
            intent = await client.payments.create(
                CreatePaymentIntentParams(
                    amount="0.01",
                    resource="/api/data"
                )
            )

            # Get budget stats
            stats = await client.budget.get_statistics()
            print(f"Daily spent: {stats['daily_spent']} ZEC")

    asyncio.run(main())
    ```
"""

__version__ = "0.1.0"

# Main client
from z402.client import Z402Client

# Models
from z402.models import (
    CreatePaymentIntentParams,
    ListTransactionsParams,
    PaymentIntent,
    PaymentParams,
    PaymentStatus,
    RefundParams,
    Transaction,
    TransactionStatus,
    UpdateWebhookParams,
    WebhookConfig,
    WebhookEvent,
)

# Exceptions
from z402.exceptions import (
    APIError,
    AuthenticationError,
    BudgetExceededError,
    InvalidRequestError,
    NetworkError,
    NotFoundError,
    PaymentRequiredError,
    RateLimitError,
    WalletError,
    WebhookVerificationError,
    Z402Error,
)

# Resources
from z402.resources import PaymentsResource, TransactionsResource, WebhooksResource

# Utilities
from z402.utils import (
    AsyncHTTPClient,
    BudgetManager,
    construct_webhook_signature,
    retry_with_backoff,
    verify_webhook,
)

__all__ = [
    # Version
    "__version__",
    # Client
    "Z402Client",
    # Models
    "PaymentIntent",
    "CreatePaymentIntentParams",
    "PaymentParams",
    "PaymentStatus",
    "Transaction",
    "ListTransactionsParams",
    "RefundParams",
    "TransactionStatus",
    "WebhookEvent",
    "WebhookConfig",
    "UpdateWebhookParams",
    # Exceptions
    "Z402Error",
    "AuthenticationError",
    "InvalidRequestError",
    "NotFoundError",
    "RateLimitError",
    "PaymentRequiredError",
    "APIError",
    "NetworkError",
    "WebhookVerificationError",
    "BudgetExceededError",
    "WalletError",
    # Resources
    "PaymentsResource",
    "TransactionsResource",
    "WebhooksResource",
    # Utilities
    "AsyncHTTPClient",
    "BudgetManager",
    "retry_with_backoff",
    "verify_webhook",
    "construct_webhook_signature",
]
