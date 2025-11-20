"""Webhook models"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from z402.models.transaction import Transaction


class WebhookEvent(BaseModel):
    """Webhook event model"""

    id: str
    type: str
    data: Transaction
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class WebhookConfig(BaseModel):
    """Webhook configuration model"""

    url: str
    secret: str
    events: List[str]
    enabled: bool

    class Config:
        populate_by_name = True


class UpdateWebhookParams(BaseModel):
    """Parameters for updating webhook configuration"""

    webhook_url: str = Field(alias="webhookUrl")
    events: Optional[List[str]] = None

    class Config:
        populate_by_name = True
