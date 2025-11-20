from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from z402 import Z402
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional

load_dotenv()

app = FastAPI(
    title="{{PROJECT_NAME}}",
    description="A Z402-integrated FastAPI application",
    version="0.1.0"
)

# Initialize Z402
z402 = Z402(
    api_key=os.getenv("Z402_API_KEY"),
    network=os.getenv("Z402_NETWORK", "testnet")
)


@app.get("/")
async def root():
    """Public endpoint - no payment required"""
    return {
        "message": "Z402-integrated API",
        "version": "0.1.0",
        "docs": "/docs",
        "network": os.getenv("Z402_NETWORK", "testnet")
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/premium")
async def premium_content(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Protected endpoint - requires payment"""

    # Check if payment authorization is provided
    if not authorization:
        # Create payment intent
        payment_url = await z402.create_payment_intent(
            amount=0.01,
            resource_url=str(request.url)
        )

        raise HTTPException(
            status_code=402,
            detail={
                "error": "Payment required",
                "message": "This content requires a payment of 0.01 ZEC",
                "payment_url": payment_url
            }
        )

    # Verify payment
    is_valid = await z402.verify_payment(authorization)

    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "Invalid payment authorization",
                "message": "The provided payment token is invalid or expired"
            }
        )

    # Payment verified - return premium content
    return {
        "message": "Premium content unlocked!",
        "data": {
            "secret": "This is exclusive premium content",
            "value": "Only paid users can see this",
            "timestamp": datetime.utcnow().isoformat()
        }
    }


@app.post("/webhooks/z402")
async def webhook_handler(
    request: Request,
    x_z402_signature: Optional[str] = Header(None)
):
    """Handle Z402 webhook events"""

    try:
        event = await request.json()

        print(f"Webhook received: {event.get('type')}")

        # Verify signature
        if not x_z402_signature:
            raise HTTPException(
                status_code=401,
                detail="Missing signature"
            )

        is_valid = z402.verify_webhook(event, x_z402_signature)

        if not is_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid signature"
            )

        # Handle different event types
        event_type = event.get("type")

        if event_type == "payment.created":
            print(f"Payment created: {event['data']['id']}")

        elif event_type == "payment.verified":
            print(f"Payment verified: {event['data']['id']}")
            # Grant access to content

        elif event_type == "payment.settled":
            print(f"Payment settled: {event['data']['id']}")

        elif event_type == "payment.failed":
            print(f"Payment failed: {event['data']['id']}")

        elif event_type == "payment.refunded":
            print(f"Payment refunded: {event['data']['id']}")
            # Revoke access

        else:
            print(f"Unhandled event type: {event_type}")

        return {"received": True}

    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Webhook processing failed"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if os.getenv("NODE_ENV") == "development" else None
        }
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 3000))

    print(f"Starting server on http://localhost:{port}")
    print(f"Environment: {os.getenv('NODE_ENV', 'development')}")
    print(f"Network: {os.getenv('Z402_NETWORK', 'testnet')}")
    print(f"Protected endpoint: http://localhost:{port}/api/premium")
    print(f"Webhook endpoint: http://localhost:{port}/webhooks/z402")
    print(f"API docs: http://localhost:{port}/docs")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("NODE_ENV") != "production"
    )
