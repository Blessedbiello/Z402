"""
Basic Usage Examples

Demonstrates basic SDK functionality for common use cases.
"""

import asyncio
import os

from dotenv import load_dotenv

from z402 import (
    BudgetManager,
    CreatePaymentIntentParams,
    ListTransactionsParams,
    PaymentParams,
    PaymentStatus,
    TransactionStatus,
    UpdateWebhookParams,
    Z402Client,
    verify_webhook,
)

load_dotenv()


async def example_create_payment():
    """Create a payment intent"""
    print("\n" + "=" * 60)
    print("Example: Create Payment Intent")
    print("=" * 60)

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet"
    ) as client:
        # Create payment intent
        intent = await client.payments.create(
            CreatePaymentIntentParams(
                amount="0.01",
                resource="/api/premium/data",
                metadata={"user_id": "123", "plan": "premium"},
            )
        )

        print(f"Payment Intent Created:")
        print(f"  ID: {intent.id}")
        print(f"  Amount: {intent.amount} ZEC")
        print(f"  Status: {intent.status.value}")
        print(f"  Pay to: {intent.zcash_address}")
        print(f"  Expires: {intent.expires_at}")


async def example_verify_payment():
    """Verify a payment"""
    print("\n" + "=" * 60)
    print("Example: Verify Payment")
    print("=" * 60)

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet"
    ) as client:
        # First create a payment
        intent = await client.payments.create(
            CreatePaymentIntentParams(amount="0.01", resource="/api/data")
        )

        print(f"Created payment: {intent.id}")

        # Verify payment status
        verified = await client.payments.verify(intent.id)
        print(f"Payment status: {verified.status.value}")

        if verified.status == PaymentStatus.SETTLED:
            print("✓ Payment settled - grant access to resource")
        else:
            print("✗ Payment not yet settled")


async def example_list_transactions():
    """List transactions with filtering"""
    print("\n" + "=" * 60)
    print("Example: List Transactions")
    print("=" * 60)

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet"
    ) as client:
        # List recent settled transactions
        response = await client.transactions.list(
            ListTransactionsParams(
                limit=10,
                status=TransactionStatus.SETTLED,
                date_from="2025-01-01",
            )
        )

        print(f"Total transactions: {response.total}")
        print(f"Showing: {len(response.transactions)}")
        print(f"Has more: {response.has_more}")

        for tx in response.transactions:
            print(f"\n  {tx.id}")
            print(f"  Amount: {tx.amount} {tx.currency}")
            print(f"  Status: {tx.status.value}")
            print(f"  Resource: {tx.resource_url}")


async def example_refund():
    """Refund a transaction"""
    print("\n" + "=" * 60)
    print("Example: Refund Transaction")
    print("=" * 60)

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet"
    ) as client:
        # Get a transaction (you'd have a real transaction ID)
        # For demo, we'll just show the API call
        print("To refund a transaction:")
        print("  tx = await client.transactions.refund(")
        print("      'tx_123...',")
        print("      RefundParams(reason='Customer requested refund')")
        print("  )")


async def example_export_transactions():
    """Export transactions to CSV"""
    print("\n" + "=" * 60)
    print("Example: Export Transactions")
    print("=" * 60)

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet"
    ) as client:
        # Export to CSV
        csv_data = await client.transactions.export_csv(
            ListTransactionsParams(
                date_from="2025-01-01",
                date_to="2025-01-31",
            )
        )

        print(f"CSV Export: {len(csv_data)} characters")
        print("First 200 chars:")
        print(csv_data[:200])

        # Could save to file:
        # with open("transactions.csv", "w") as f:
        #     f.write(csv_data)


async def example_webhook_management():
    """Manage webhooks"""
    print("\n" + "=" * 60)
    print("Example: Webhook Management")
    print("=" * 60)

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet"
    ) as client:
        # Update webhook
        config = await client.webhooks.update(
            UpdateWebhookParams(
                webhook_url="https://example.com/webhooks/z402",
                events=["payment.settled", "payment.failed"],
            )
        )

        print(f"Webhook configured:")
        print(f"  URL: {config.url}")
        print(f"  Events: {', '.join(config.events)}")
        print(f"  Secret: {config.secret[:10]}...")


def example_verify_webhook_signature():
    """Verify webhook signature"""
    print("\n" + "=" * 60)
    print("Example: Verify Webhook Signature")
    print("=" * 60)

    # Example webhook payload
    payload = {
        "id": "evt_123",
        "type": "payment.settled",
        "data": {"id": "tx_123", "amount": "0.01"},
        "createdAt": "2025-01-01T00:00:00Z",
    }

    # Example signature (would come from webhook header)
    signature = "t=1234567890,v1=abc123..."

    # Verify (would use real secret from webhook config)
    secret = "whsec_test_secret"

    try:
        event = verify_webhook(payload, signature, secret)
        print(f"✓ Webhook verified")
        print(f"  Event type: {event['type']}")
        print(f"  Event ID: {event['id']}")
    except Exception as e:
        print(f"✗ Verification failed: {str(e)}")


async def example_budget_management():
    """Budget management for AI agents"""
    print("\n" + "=" * 60)
    print("Example: Budget Management")
    print("=" * 60)

    # Create budget manager
    budget = BudgetManager(
        daily_limit="1.0",
        hourly_limit="0.1",
        transaction_limit="0.05",
    )

    # Check if can spend
    can_spend = await budget.can_spend("0.02")
    print(f"Can spend 0.02 ZEC: {can_spend}")

    # Record spending
    await budget.record_spend("0.02", "tx_123", metadata={"purpose": "API access"})
    print("Recorded spend: 0.02 ZEC")

    # Get statistics
    stats = await budget.get_statistics()
    print(f"\nBudget Statistics:")
    print(f"  Daily limit: {stats['daily_limit']} ZEC")
    print(f"  Daily spent: {stats['daily_spent']} ZEC")
    print(f"  Daily remaining: {stats['daily_remaining']} ZEC")
    print(f"  Usage: {stats['daily_usage_percent']:.1f}%")


async def example_with_budget():
    """Using Z402Client with budget manager"""
    print("\n" + "=" * 60)
    print("Example: Client with Budget Manager")
    print("=" * 60)

    budget = BudgetManager(daily_limit="1.0")

    async with Z402Client(
        api_key=os.getenv("Z402_API_KEY", ""),
        network="testnet",
        budget_manager=budget,
    ) as client:
        # Convenience method with automatic budget checking
        # payment = await client.pay(
        #     amount="0.01",
        #     resource="/api/data",
        #     from_address="zs1...",
        #     tx_id="...",
        # )

        # Get budget stats
        if client.budget:
            stats = await client.budget.get_statistics()
            print(f"Budget usage: {stats['daily_usage_percent']:.1f}%")


async def main():
    """Run all examples"""
    api_key = os.getenv("Z402_API_KEY")
    if not api_key:
        print("Warning: Z402_API_KEY not set. Some examples will be skipped.")
        print("Set it with: export Z402_API_KEY=z402_test_...")

    # Run examples
    if api_key:
        await example_create_payment()
        await example_verify_payment()
        await example_list_transactions()
        await example_export_transactions()
        await example_webhook_management()

    # These work without API key
    example_verify_webhook_signature()
    await example_budget_management()

    print("\n" + "=" * 60)
    print("Examples complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
