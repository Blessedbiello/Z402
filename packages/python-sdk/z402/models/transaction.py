"""Transaction models"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TransactionStatus(str, Enum):
    """Transaction status enum"""

    PENDING = "pending"
    SETTLED = "settled"
    FAILED = "failed"
    REFUNDED = "refunded"


class Transaction(BaseModel):
    """Transaction model"""

    id: str
    merchant_id: str = Field(alias="merchantId")
    amount: str
    currency: str = "ZEC"
    status: TransactionStatus
    payment_intent_id: str = Field(alias="paymentIntentId")
    resource_url: str = Field(alias="resourceUrl")
    from_address: Optional[str] = Field(default=None, alias="fromAddress")
    to_address: str = Field(alias="toAddress")
    tx_id: Optional[str] = Field(default=None, alias="txId")
    confirmations: int = 0
    metadata: Optional[Dict[str, Any]] = None
    failure_reason: Optional[str] = Field(default=None, alias="failureReason")
    refunded_at: Optional[datetime] = Field(default=None, alias="refundedAt")
    settled_at: Optional[datetime] = Field(default=None, alias="settledAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    class Config:
        populate_by_name = True


class ListTransactionsParams(BaseModel):
    """Parameters for listing transactions"""

    limit: Optional[int] = 100
    offset: Optional[int] = 0
    status: Optional[TransactionStatus] = None
    date_from: Optional[str] = Field(default=None, alias="dateFrom")
    date_to: Optional[str] = Field(default=None, alias="dateTo")
    resource: Optional[str] = None

    class Config:
        populate_by_name = True


class ListTransactionsResponse(BaseModel):
    """Response for list transactions"""

    transactions: List[Transaction]
    total: int
    has_more: bool = Field(alias="hasMore")

    class Config:
        populate_by_name = True


class RefundParams(BaseModel):
    """Parameters for refunding a transaction"""

    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
