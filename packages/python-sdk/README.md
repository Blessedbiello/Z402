# z402-sdk

Python SDK for Z402 - Optimized for AI agents and automation scripts.

## Features

- 🤖 **AI Agent Optimized** - Built specifically for autonomous agents
- 💰 **Budget Management** - Track and limit spending automatically
- ⚡ **Async/Await** - Full asyncio support for high performance
- 🔄 **Auto Retry** - Exponential backoff for reliability
- 🛡️ **Type Safe** - Complete type hints with Pydantic models
- 🔐 **Webhook Verification** - Secure signature validation
- 🎯 **Framework Integration** - FastAPI and Flask middleware
- 📊 **CLI Tool** - Command-line interface for testing
- 📚 **Well Documented** - Comprehensive examples and docstrings

## Installation

```bash
pip install z402-sdk

# With optional dependencies
pip install z402-sdk[langchain]   # LangChain integration
pip install z402-sdk[fastapi]     # FastAPI middleware
pip install z402-sdk[flask]       # Flask middleware
pip install z402-sdk[dev]         # Development tools
```

## Quick Start

```python
import asyncio
from z402 import Z402Client, CreatePaymentIntentParams

async def main():
    async with Z402Client(
        api_key="z402_test_...",
        network="testnet"
    ) as client:
        # Create payment intent
        intent = await client.payments.create(
            CreatePaymentIntentParams(
                amount="0.01",
                resource="/api/premium/data",
                metadata={"user_id": "123"}
            )
        )

        print(f"Pay {intent.amount} ZEC to: {intent.zcash_address}")

        # Verify payment
        verified = await client.payments.verify(intent.id)
        if verified.status == "settled":
            print("Payment confirmed!")

asyncio.run(main())
```

## AI Agent Example

The SDK is designed for autonomous AI agents that need to pay for API access:

```python
from decimal import Decimal
import aiohttp
from z402 import Z402Client, BudgetManager

class AIResearchAgent:
    def __init__(self):
        self.budget = BudgetManager(
            daily_limit="1.0",     # 1 ZEC per day
            hourly_limit="0.1",    # 0.1 ZEC per hour
            transaction_limit="0.01" # Max 0.01 per transaction
        )

        self.z402 = Z402Client(
            api_key="z402_test_...",
            network="testnet",
            budget_manager=self.budget
        )

    async def fetch_premium_data(self, endpoint: str):
        async with aiohttp.ClientSession() as session:
            response = await session.get(endpoint)

            if response.status == 402:
                # Payment required
                payment_info = await response.json()
                amount = payment_info['payment']['amount']

                # Agent decides if worth paying
                if Decimal(amount) <= Decimal("0.01"):
                    # Check budget
                    if await self.budget.can_spend(amount):
                        # Make payment
                        payment = await self.z402.pay(
                            amount=amount,
                            resource=endpoint,
                            from_address="zs1...",
                            tx_id="..."
                        )

                        # Retry with payment proof
                        response = await session.get(
                            endpoint,
                            headers={"z402-payment-intent": payment.id}
                        )

            return await response.json()

# Usage
async with AIResearchAgent() as agent:
    data = await agent.fetch_premium_data("https://api.example.com/data")
```

## Budget Management

Track and limit autonomous spending:

```python
from z402 import BudgetManager

budget = BudgetManager(
    daily_limit="1.0",      # Daily spending limit
    hourly_limit="0.1",     # Hourly spending limit
    transaction_limit="0.05" # Per-transaction limit
)

# Check before spending
if await budget.can_spend("0.02"):
    # Make payment
    await budget.record_spend("0.02", "tx_123")

# Get statistics
stats = await budget.get_statistics()
print(f"Daily spent: {stats['daily_spent']} ZEC")
print(f"Remaining: {stats['daily_remaining']} ZEC")
print(f"Usage: {stats['daily_usage_percent']:.1f}%")

# Transaction history
history = await budget.get_transaction_history(hours=24)
```

## API Reference

### Payments

```python
# Create payment intent
intent = await client.payments.create(
    CreatePaymentIntentParams(
        amount="0.01",
        resource="/api/data",
        metadata={"key": "value"},
        expires_in=3600  # Optional
    )
)

# Get payment intent
intent = await client.payments.get("pi_...")

# Submit payment
payment = await client.payments.pay(
    "pi_...",
    PaymentParams(from_address="zs1...", tx_id="...")
)

# Verify payment
verified = await client.payments.verify("pi_...")

# Cancel payment intent
await client.payments.cancel("pi_...")
```

### Transactions

```python
# List transactions
response = await client.transactions.list(
    ListTransactionsParams(
        limit=100,
        status=TransactionStatus.SETTLED,
        date_from="2025-01-01",
        date_to="2025-01-31"
    )
)

# Get transaction
tx = await client.transactions.get("tx_...")

# Refund transaction
await client.transactions.refund(
    "tx_...",
    RefundParams(reason="Customer requested refund")
)

# Export to CSV
csv = await client.transactions.export_csv(
    ListTransactionsParams(date_from="2025-01-01")
)

# Export to JSON
transactions = await client.transactions.export_json()
```

### Webhooks

```python
# Get webhook config
config = await client.webhooks.get()

# Update webhook
await client.webhooks.update(
    UpdateWebhookParams(
        webhook_url="https://example.com/webhooks",
        events=["payment.settled", "payment.failed"]
    )
)

# Test webhook
result = await client.webhooks.test()

# Delete webhook
await client.webhooks.delete()
```

## Webhook Verification

```python
from z402 import verify_webhook
from fastapi import Request

@app.post("/webhooks/z402")
async def handle_webhook(request: Request):
    signature = request.headers.get("z402-signature")
    body = await request.body()

    try:
        event = verify_webhook(body, signature, webhook_secret)

        if event["type"] == "payment.settled":
            # Handle settled payment
            print(f"Payment settled: {event['data']['id']}")

        return {"received": True}

    except WebhookVerificationError:
        return {"error": "Invalid signature"}, 400
```

## FastAPI Middleware

```python
from fastapi import FastAPI, Request
from z402.middleware import Z402Middleware

app = FastAPI()

# Add middleware
app.add_middleware(
    Z402Middleware,
    api_key="z402_test_...",
    protected_paths=["/api/premium"],
    amount="0.01",
    resource="/api/premium"
)

@app.get("/api/premium/data")
async def get_premium_data(request: Request):
    # Access payment info
    payment = request.state.z402_payment
    return {"data": "Premium content", "payment": payment}
```

Or use as a dependency:

```python
from fastapi import Depends
from z402.middleware import z402_required

@app.get(
    "/premium/data",
    dependencies=[Depends(z402_required(amount="0.01", resource="/premium"))]
)
async def premium_data(request: Request):
    return {"data": "Premium content"}
```

## Flask Integration

```python
from flask import Flask
from z402.middleware import flask_z402_required

app = Flask(__name__)

@app.route("/api/premium")
@flask_z402_required(amount="0.01", resource="/api/premium")
def premium_data():
    return {"data": "Premium content"}
```

## CLI Tool

The SDK includes a powerful CLI for testing:

```bash
# Create payment intent
z402 create-payment --amount 0.01 --resource /api/data

# Get payment details
z402 get-payment pi_...

# List transactions
z402 list-transactions --limit 10 --status settled

# Show budget statistics
z402 budget-stats --daily-limit 1.0 --hourly-limit 0.1

# Get webhook config
z402 webhook-config

# Show SDK version
z402 version
```

Set your API key:

```bash
export Z402_API_KEY=z402_test_...
```

## LangChain Integration

Integrate with LangChain agents:

```python
from langchain.tools import BaseTool
from z402 import Z402Client, BudgetManager

class PremiumDataTool(BaseTool):
    name = "premium_data_access"
    description = "Access premium APIs with automatic payment"

    def __init__(self):
        self.z402 = Z402Client(
            api_key="z402_test_...",
            budget_manager=BudgetManager(daily_limit="0.5")
        )

    async def _arun(self, query: str) -> str:
        # Check budget
        if not await self.z402.budget.can_spend("0.01"):
            return "Budget exceeded"

        # Create and pay for access
        intent = await self.z402.payments.create(
            CreatePaymentIntentParams(
                amount="0.01",
                resource=f"/api/data/{query}"
            )
        )

        # Access paid API
        return f"Accessed premium data for: {query}"

# Add to LangChain agent
tools = [PremiumDataTool()]
```

## Error Handling

```python
from z402 import (
    Z402Error,
    AuthenticationError,
    PaymentRequiredError,
    BudgetExceededError,
    RateLimitError,
)

try:
    intent = await client.payments.create(params)
except AuthenticationError:
    print("Invalid API key")
except PaymentRequiredError as e:
    print(f"Payment required: {e.amount} ZEC for {e.resource}")
except BudgetExceededError as e:
    print(f"Budget exceeded: {e.limit} ZEC limit")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except Z402Error as e:
    print(f"Error: {e.message} (code: {e.code})")
```

## Configuration

### Environment Variables

```bash
# Required
Z402_API_KEY=z402_test_...

# Optional
Z402_API_URL=https://api-testnet.z402.io/v1
Z402_WEBHOOK_SECRET=whsec_...
ZCASH_ADDRESS=zs1...  # For autonomous payments
```

### Client Options

```python
client = Z402Client(
    api_key="z402_test_...",
    network="testnet",           # or "mainnet"
    base_url="https://...",      # Optional custom URL
    max_retries=3,               # Retry attempts
    timeout=30,                  # Request timeout (seconds)
    debug=True,                  # Enable debug logging
    budget_manager=budget        # Optional budget manager
)
```

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy z402

# Linting
ruff check z402

# Formatting
black z402
```

## Examples

See the [`examples/`](examples/) directory for:

- [`basic_usage.py`](examples/basic_usage.py) - Common SDK operations
- [`ai_agent.py`](examples/ai_agent.py) - Autonomous AI agent with budget management
- [`langchain_integration.py`](examples/langchain_integration.py) - LangChain tools
- More examples for AutoGPT, agent frameworks, etc.

## Type Safety

Full type hints with Pydantic models:

```python
from z402 import PaymentIntent, Transaction, PaymentStatus

intent: PaymentIntent = await client.payments.get("pi_...")
assert intent.status == PaymentStatus.SETTLED

tx: Transaction = await client.transactions.get("tx_...")
print(f"Amount: {tx.amount} {tx.currency}")
```

## Retry Logic

Automatic exponential backoff:

- **Retryable errors**: Network failures, rate limits, server errors (5xx)
- **Default retries**: 3 attempts
- **Backoff**: 1s → 2s → 4s → 8s
- **Max delay**: 30 seconds

Configure retries:

```python
client = Z402Client(api_key="...", max_retries=5)
```

## License

MIT

## Support

- Documentation: https://docs.z402.io/python
- API Reference: https://api.z402.io/docs
- Issues: https://github.com/z402/python-sdk/issues
- Discord: https://discord.gg/z402
