"""Webhooks resource"""

from typing import TYPE_CHECKING, Any, Dict

from z402.models.webhook import UpdateWebhookParams, WebhookConfig

if TYPE_CHECKING:
    from z402.utils.http import AsyncHTTPClient


class WebhooksResource:
    """
    Webhooks API resource.

    Provides methods for managing webhook configuration.
    """

    def __init__(self, http: "AsyncHTTPClient") -> None:
        self._http = http

    async def get(self) -> WebhookConfig:
        """
        Get webhook configuration.

        Returns:
            Webhook configuration

        Example:
            ```python
            config = await client.webhooks.get()
            print(config.url, config.secret)
            ```
        """
        data = await self._http.get("/webhook-management")
        return WebhookConfig(**data)

    async def update(self, params: UpdateWebhookParams) -> WebhookConfig:
        """
        Update webhook configuration.

        Args:
            params: Webhook parameters

        Returns:
            Updated webhook configuration

        Example:
            ```python
            await client.webhooks.update(
                UpdateWebhookParams(
                    webhook_url="https://example.com/webhooks/z402",
                    events=["payment.settled", "payment.failed"]
                )
            )
            ```
        """
        data = await self._http.put("/webhook-management", body=params.model_dump(by_alias=True))
        return WebhookConfig(**data)

    async def delete(self) -> None:
        """
        Delete webhook configuration.

        Example:
            ```python
            await client.webhooks.delete()
            ```
        """
        await self._http.delete("/webhook-management")

    async def test(self) -> Dict[str, Any]:
        """
        Test webhook by sending a test event.

        Returns:
            Test result

        Example:
            ```python
            result = await client.webhooks.test()
            print(result["success"], result.get("response"))
            ```
        """
        return await self._http.post("/webhook-management/test")
