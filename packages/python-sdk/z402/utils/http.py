"""Async HTTP client with retry logic"""

import asyncio
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import aiohttp

from z402.exceptions import (
    APIError,
    AuthenticationError,
    InvalidRequestError,
    NetworkError,
    NotFoundError,
    PaymentRequiredError,
    RateLimitError,
)
from z402.utils.retry import retry_with_backoff


class AsyncHTTPClient:
    """
    Async HTTP client with automatic retries and error handling.

    Args:
        api_key: Z402 API key
        base_url: Base URL for API requests
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds
        debug: Enable debug logging
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.z402.io/v1",
        max_retries: int = 3,
        timeout: int = 30,
        debug: bool = False,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self.timeout = timeout
        self.debug = debug
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self) -> "AsyncHTTPClient":
        """Async context manager entry"""
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit"""
        await self.close()

    async def _ensure_session(self) -> None:
        """Ensure aiohttp session exists"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(timeout=timeout)

    async def close(self) -> None:
        """Close the HTTP session"""
        if self._session and not self._session.closed:
            await self._session.close()

    def _build_url(self, path: str, query: Optional[Dict[str, Any]] = None) -> str:
        """Build full URL with query parameters"""
        url = f"{self.base_url}{path}"
        if query:
            # Filter out None values
            filtered_query = {k: v for k, v in query.items() if v is not None}
            if filtered_query:
                url += f"?{urlencode(filtered_query)}"
        return url

    def _build_headers(self, custom_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """Build request headers"""
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "User-Agent": "z402-python-sdk/0.1.0",
        }
        if custom_headers:
            headers.update(custom_headers)
        return headers

    async def _handle_response(self, response: aiohttp.ClientResponse) -> Dict[str, Any]:
        """Handle API response and errors"""
        try:
            data = await response.json()
        except Exception:
            text = await response.text()
            data = {"message": text} if text else {}

        if self.debug and data:
            print(f"[Z402 SDK] Response data: {data}")

        if not response.ok:
            message = data.get("error", {}).get("message") or data.get("message") or "API error"
            details = data.get("error", {}).get("details") or data.get("details")

            if response.status == 401:
                raise AuthenticationError(message, details=details)
            elif response.status == 400:
                raise InvalidRequestError(message, details=details)
            elif response.status == 402:
                payment_info = data.get("payment", {})
                raise PaymentRequiredError(
                    message,
                    amount=payment_info.get("amount"),
                    resource=payment_info.get("resource"),
                    details=details,
                )
            elif response.status == 404:
                raise NotFoundError(message, details=details)
            elif response.status == 429:
                retry_after = response.headers.get("retry-after")
                raise RateLimitError(
                    message,
                    retry_after=int(retry_after) if retry_after else None,
                    details=details,
                )
            else:
                raise APIError(message, status_code=response.status, details=details)

        return data

    @retry_with_backoff()
    async def request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
        query: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic.

        Args:
            method: HTTP method
            path: API endpoint path
            body: Request body (for POST, PUT, PATCH)
            query: Query parameters
            headers: Custom headers

        Returns:
            Response data

        Raises:
            Z402Error: On API errors
            NetworkError: On network failures
        """
        await self._ensure_session()

        url = self._build_url(path, query)
        request_headers = self._build_headers(headers)

        if self.debug:
            print(f"[Z402 SDK] {method} {url}")
            if body:
                print(f"[Z402 SDK] Request body: {body}")

        try:
            async with self._session.request(  # type: ignore
                method=method,
                url=url,
                json=body if body else None,
                headers=request_headers,
            ) as response:
                if self.debug:
                    print(f"[Z402 SDK] Response {response.status}")

                return await self._handle_response(response)

        except asyncio.TimeoutError:
            raise NetworkError("Request timeout")
        except aiohttp.ClientError as error:
            raise NetworkError(str(error), details=error)

    async def get(
        self, path: str, query: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """GET request"""
        return await self.request("GET", path, query=query)

    async def post(
        self, path: str, body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """POST request"""
        return await self.request("POST", path, body=body)

    async def put(
        self, path: str, body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """PUT request"""
        return await self.request("PUT", path, body=body)

    async def delete(self, path: str) -> Dict[str, Any]:
        """DELETE request"""
        return await self.request("DELETE", path)

    async def patch(
        self, path: str, body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """PATCH request"""
        return await self.request("PATCH", path, body=body)
