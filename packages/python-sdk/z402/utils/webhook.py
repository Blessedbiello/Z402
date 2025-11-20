"""Webhook signature verification utilities"""

import hashlib
import hmac
import json
import time
from typing import Any, Dict, Union

from z402.exceptions import WebhookVerificationError


def verify_webhook(
    payload: Union[str, bytes, Dict[str, Any]],
    signature: str,
    secret: str,
    tolerance: int = 300,
) -> Dict[str, Any]:
    """
    Verify webhook signature and return parsed event.

    Args:
        payload: Raw request body (string, bytes, or dict)
        signature: Signature from z402-signature header
        secret: Your webhook secret
        tolerance: Maximum age of signature in seconds (default: 300)

    Returns:
        Parsed webhook event

    Raises:
        WebhookVerificationError: If signature is invalid

    Example:
        ```python
        @app.post("/webhooks/z402")
        async def handle_webhook(request: Request):
            signature = request.headers.get("z402-signature")
            body = await request.body()

            try:
                event = verify_webhook(body, signature, webhook_secret)
                # Handle event
                return {"received": True}
            except WebhookVerificationError as e:
                return {"error": str(e)}, 400
        ```
    """
    if not signature:
        raise WebhookVerificationError("Missing signature header")

    if not secret:
        raise WebhookVerificationError("Webhook secret not provided")

    # Parse signature (format: t=timestamp,v1=signature)
    parts = signature.split(",")
    timestamp_part = next((p for p in parts if p.startswith("t=")), None)
    signature_part = next((p for p in parts if p.startswith("v1=")), None)

    if not timestamp_part or not signature_part:
        raise WebhookVerificationError("Invalid signature format")

    timestamp_str = timestamp_part.split("=", 1)[1]
    provided_signature = signature_part.split("=", 1)[1]

    # Check timestamp is within tolerance
    try:
        timestamp = int(timestamp_str)
    except ValueError:
        raise WebhookVerificationError("Invalid timestamp in signature")

    now = int(time.time())
    if abs(now - timestamp) > tolerance:
        raise WebhookVerificationError("Signature timestamp too old")

    # Convert payload to string
    if isinstance(payload, dict):
        payload_string = json.dumps(payload, separators=(",", ":"))
    elif isinstance(payload, bytes):
        payload_string = payload.decode("utf-8")
    else:
        payload_string = payload

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload_string}"
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Compare signatures (constant time to prevent timing attacks)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise WebhookVerificationError("Invalid signature")

    # Parse and return event
    try:
        if isinstance(payload, dict):
            return payload
        return json.loads(payload_string)
    except json.JSONDecodeError:
        raise WebhookVerificationError("Invalid JSON payload")


def construct_webhook_signature(
    payload: Union[str, Dict[str, Any]],
    secret: str,
) -> str:
    """
    Construct webhook signature for testing.

    Args:
        payload: Webhook payload (string or dict)
        secret: Webhook secret

    Returns:
        Signature string in format: t=timestamp,v1=signature

    Example:
        ```python
        payload = {"type": "payment.settled", "data": {...}}
        signature = construct_webhook_signature(payload, "secret")
        ```
    """
    timestamp = int(time.time())

    if isinstance(payload, dict):
        payload_string = json.dumps(payload, separators=(",", ":"))
    else:
        payload_string = payload

    signed_payload = f"{timestamp}.{payload_string}"
    signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"t={timestamp},v1={signature}"
