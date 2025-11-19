"""
Middleware for FastAPI and Flask

Provides payment protection middleware for web frameworks.
"""

import os
from functools import wraps
from typing import Any, Awaitable, Callable, Optional

try:
    from fastapi import Request, Response
    from fastapi.responses import JSONResponse
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

try:
    from flask import Request as FlaskRequest, jsonify
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False

import aiohttp

from z402.exceptions import Z402Error


# FastAPI Middleware
if FASTAPI_AVAILABLE:

    class Z402Middleware:
        """
        FastAPI middleware for Z402 payment protection.

        Example:
            ```python
            from fastapi import FastAPI
            from z402.middleware import Z402Middleware

            app = FastAPI()

            app.add_middleware(
                Z402Middleware,
                api_key=os.getenv("Z402_API_KEY"),
                protected_paths=["/api/premium"],
                amount="0.01",
                resource="/api/premium"
            )
            ```
        """

        def __init__(
            self,
            app: Any,
            api_key: str,
            protected_paths: list[str],
            amount: str,
            resource: str,
            base_url: str = "https://api.z402.io/v1",
        ) -> None:
            self.app = app
            self.api_key = api_key
            self.protected_paths = protected_paths
            self.amount = amount
            self.resource = resource
            self.base_url = base_url

        async def __call__(
            self,
            request: Request,
            call_next: Callable[[Request], Awaitable[Response]],
        ) -> Response:
            # Check if path is protected
            if not any(request.url.path.startswith(path) for path in self.protected_paths):
                return await call_next(request)

            # Check for payment intent ID
            payment_intent_id = request.headers.get("z402-payment-intent")

            if not payment_intent_id:
                return JSONResponse(
                    status_code=402,
                    content={
                        "error": {
                            "code": "payment_required",
                            "message": "Payment required to access this resource",
                        },
                        "payment": {
                            "amount": self.amount,
                            "currency": "ZEC",
                            "resource": self.resource,
                        },
                    },
                )

            # Verify payment
            try:
                verify_url = f"{self.base_url}/payment-intents/{payment_intent_id}/verify"
                headers = {"X-API-Key": self.api_key}

                async with aiohttp.ClientSession() as session:
                    async with session.get(verify_url, headers=headers) as response:
                        if not response.ok:
                            raise Exception(f"Verification failed: {response.status}")

                        payment_intent = await response.json()

                # Check status
                if payment_intent["status"] != "settled":
                    return JSONResponse(
                        status_code=402,
                        content={
                            "error": {
                                "code": "payment_not_settled",
                                "message": "Payment has not been settled yet",
                            },
                            "payment": {
                                "status": payment_intent["status"],
                                "amount": payment_intent["amount"],
                            },
                        },
                    )

                # Check amount
                if float(payment_intent["amount"]) < float(self.amount):
                    return JSONResponse(
                        status_code=402,
                        content={
                            "error": {
                                "code": "insufficient_payment",
                                "message": "Payment amount is insufficient",
                            },
                            "payment": {
                                "required": self.amount,
                                "paid": payment_intent["amount"],
                            },
                        },
                    )

                # Attach payment to request state
                request.state.z402_payment = payment_intent

                return await call_next(request)

            except Exception as error:
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": {
                            "code": "internal_error",
                            "message": "Failed to verify payment",
                        }
                    },
                )


    def z402_required(
        amount: str,
        resource: str,
        api_key: Optional[str] = None,
        base_url: str = "https://api.z402.io/v1",
    ) -> Callable:
        """
        FastAPI dependency for protecting individual routes.

        Example:
            ```python
            from fastapi import Depends, FastAPI
            from z402.middleware import z402_required

            app = FastAPI()

            @app.get("/premium/data", dependencies=[Depends(z402_required(amount="0.01", resource="/premium/data"))])
            async def get_premium_data(request: Request):
                payment = request.state.z402_payment
                return {"data": "Premium content", "payment": payment}
            ```
        """
        async def dependency(request: Request) -> dict:
            api_key_used = api_key or os.getenv("Z402_API_KEY")
            if not api_key_used:
                raise ValueError("Z402 API key not provided")

            payment_intent_id = request.headers.get("z402-payment-intent")

            if not payment_intent_id:
                raise Z402Error("Payment required", status_code=402)

            # Verify payment
            verify_url = f"{base_url}/payment-intents/{payment_intent_id}/verify"
            headers = {"X-API-Key": api_key_used}

            async with aiohttp.ClientSession() as session:
                async with session.get(verify_url, headers=headers) as response:
                    if not response.ok:
                        raise Z402Error("Payment verification failed", status_code=402)

                    payment_intent = await response.json()

            if payment_intent["status"] != "settled":
                raise Z402Error("Payment not settled", status_code=402)

            if float(payment_intent["amount"]) < float(amount):
                raise Z402Error("Insufficient payment", status_code=402)

            request.state.z402_payment = payment_intent
            return payment_intent

        return dependency


# Flask Middleware
if FLASK_AVAILABLE:

    def flask_z402_required(amount: str, resource: str):
        """
        Flask decorator for protecting routes with Z402 payments.

        Example:
            ```python
            from flask import Flask
            from z402.middleware import flask_z402_required

            app = Flask(__name__)

            @app.route("/api/premium")
            @flask_z402_required(amount="0.01", resource="/api/premium")
            def premium_data():
                return {"data": "Premium content"}
            ```
        """
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                from flask import request, g

                api_key = os.getenv("Z402_API_KEY")
                if not api_key:
                    return jsonify({"error": "Server configuration error"}), 500

                payment_intent_id = request.headers.get("z402-payment-intent")

                if not payment_intent_id:
                    return jsonify({
                        "error": {
                            "code": "payment_required",
                            "message": "Payment required",
                        },
                        "payment": {
                            "amount": amount,
                            "currency": "ZEC",
                            "resource": resource,
                        },
                    }), 402

                # Verify payment (synchronous for Flask)
                import requests

                verify_url = f"https://api.z402.io/v1/payment-intents/{payment_intent_id}/verify"
                headers = {"X-API-Key": api_key}

                try:
                    response = requests.get(verify_url, headers=headers)
                    response.raise_for_status()
                    payment_intent = response.json()

                    if payment_intent["status"] != "settled":
                        return jsonify({
                            "error": {"code": "payment_not_settled"},
                            "payment": {"status": payment_intent["status"]},
                        }), 402

                    if float(payment_intent["amount"]) < float(amount):
                        return jsonify({
                            "error": {"code": "insufficient_payment"},
                            "payment": {
                                "required": amount,
                                "paid": payment_intent["amount"],
                            },
                        }), 402

                    g.z402_payment = payment_intent
                    return f(*args, **kwargs)

                except Exception as error:
                    return jsonify({"error": "Payment verification failed"}), 500

            return wrapper
        return decorator
