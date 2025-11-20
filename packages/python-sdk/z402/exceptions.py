"""
Z402 SDK Exceptions

All custom exceptions for the Z402 SDK.
"""

from typing import Any, Optional


class Z402Error(Exception):
    """Base exception for all Z402 SDK errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        code: Optional[str] = None,
        details: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details

    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(Z402Error):
    """Raised when authentication fails (401)."""

    def __init__(self, message: str = "Authentication failed", details: Optional[Any] = None):
        super().__init__(message, status_code=401, code="authentication_error", details=details)


class InvalidRequestError(Z402Error):
    """Raised when request is invalid (400)."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, status_code=400, code="invalid_request", details=details)


class NotFoundError(Z402Error):
    """Raised when resource is not found (404)."""

    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(message, status_code=404, code="not_found", details=details)


class RateLimitError(Z402Error):
    """Raised when rate limit is exceeded (429)."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        details: Optional[Any] = None,
    ):
        super().__init__(message, status_code=429, code="rate_limit", details=details)
        self.retry_after = retry_after


class PaymentRequiredError(Z402Error):
    """Raised when payment is required to access resource (402)."""

    def __init__(
        self,
        message: str = "Payment required",
        amount: Optional[str] = None,
        resource: Optional[str] = None,
        details: Optional[Any] = None,
    ):
        super().__init__(message, status_code=402, code="payment_required", details=details)
        self.amount = amount
        self.resource = resource


class APIError(Z402Error):
    """Raised for general API errors."""

    pass


class NetworkError(Z402Error):
    """Raised when network request fails."""

    def __init__(self, message: str = "Network request failed", details: Optional[Any] = None):
        super().__init__(message, status_code=0, code="network_error", details=details)


class WebhookVerificationError(Z402Error):
    """Raised when webhook signature verification fails."""

    def __init__(
        self, message: str = "Webhook verification failed", details: Optional[Any] = None
    ):
        super().__init__(
            message, status_code=400, code="webhook_verification_error", details=details
        )


class BudgetExceededError(Z402Error):
    """Raised when spending would exceed budget limit."""

    def __init__(
        self,
        message: str = "Budget limit exceeded",
        limit: Optional[str] = None,
        current: Optional[str] = None,
        details: Optional[Any] = None,
    ):
        super().__init__(message, status_code=None, code="budget_exceeded", details=details)
        self.limit = limit
        self.current = current


class WalletError(Z402Error):
    """Raised for wallet-related errors."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, status_code=None, code="wallet_error", details=details)
