"""Payment models"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PaymentStatus(str, Enum):
    """Payment status enum"""

    PENDING = "pending"
    PAID = "paid"
    SETTLED = "settled"
    FAILED = "failed"
    EXPIRED = "expired"


class PaymentIntent(BaseModel):
    """Payment intent model"""

    id: str
    amount: str
    resource: str
    status: PaymentStatus
    zcash_address: str = Field(alias="zcashAddress")
    expires_at: datetime = Field(alias="expiresAt")
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    class Config:
        populate_by_name = True


class CreatePaymentIntentParams(BaseModel):
    """Parameters for creating a payment intent"""

    amount: str
    resource: str
    metadata: Optional[Dict[str, Any]] = None
    expires_in: Optional[int] = Field(default=3600, alias="expiresIn")

    class Config:
        populate_by_name = True


class PaymentParams(BaseModel):
    """Parameters for submitting a payment"""

    from_address: str = Field(alias="fromAddress")
    tx_id: str = Field(alias="txId")

    class Config:
        populate_by_name = True
