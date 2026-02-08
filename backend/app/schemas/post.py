from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict


class PostBase(BaseModel):
    content: Optional[str] = None
    tags: Optional[str] = None
    is_public: bool = True


class PostCreate(PostBase):
    pass


class PostResponse(PostBase):
    id: int
    media_url: Optional[str]
    media_type: Optional[str]
    owner_id: int
    translations: Optional[Dict]
    created_at: datetime

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    content: str
    gif_url: Optional[str] = None
    sticker_url: Optional[str] = None


class CommentResponse(CommentBase):
    id: int
    owner_id: int
    post_id: int
    created_at: datetime

    class Config:
        from_attributes = True