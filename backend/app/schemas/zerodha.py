from datetime import datetime

from pydantic import BaseModel


class ZerodhaConfigUpdate(BaseModel):
    api_key: str
    api_secret: str


class ZerodhaConfigResponse(BaseModel):
    connected: bool
    api_key: str | None = None
    last_sync_at: datetime | None = None
    token_expiry: datetime | None = None

    model_config = {"from_attributes": True}


class ZerodhaLoginUrl(BaseModel):
    login_url: str


class ZerodhaCallback(BaseModel):
    request_token: str


class ZerodhaSyncResponse(BaseModel):
    synced_count: int
    message: str
    snapshot_taken: bool = False
