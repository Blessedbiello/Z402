"""Retry logic with exponential backoff"""

import asyncio
from functools import wraps
from typing import Any, Callable, TypeVar

from z402.exceptions import NetworkError, RateLimitError, Z402Error

T = TypeVar("T")


def is_retryable_error(error: Exception) -> bool:
    """
    Determine if an error is retryable.

    Args:
        error: The exception to check

    Returns:
        True if the error should be retried
    """
    # Retry network errors
    if isinstance(error, NetworkError):
        return True

    # Retry rate limit errors
    if isinstance(error, RateLimitError):
        return True

    # Retry server errors (5xx)
    if isinstance(error, Z402Error) and error.status_code:
        if 500 <= error.status_code < 600:
            return True

    return False


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_multiplier: float = 2.0,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for retrying async functions with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        backoff_multiplier: Multiplier for exponential backoff

    Returns:
        Decorated function

    Example:
        ```python
        @retry_with_backoff(max_retries=3)
        async def make_request():
            # Request logic
            pass
        ```
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_error: Exception

            delay = initial_delay

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as error:
                    last_error = error

                    # Don't retry on non-retryable errors
                    if not is_retryable_error(error):
                        raise

                    # Don't retry if we've exhausted attempts
                    if attempt == max_retries:
                        break

                    # Handle rate limit with custom delay
                    if isinstance(error, RateLimitError) and error.retry_after:
                        delay = min(error.retry_after, max_delay)
                    else:
                        delay = min(delay, max_delay)

                    # Wait before retrying
                    await asyncio.sleep(delay)

                    # Increase delay for next attempt
                    delay *= backoff_multiplier

            raise last_error

        return wrapper

    return decorator
