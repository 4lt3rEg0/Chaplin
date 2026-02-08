from app.utils.media_detector import detect_media_type, MediaType
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.core.security import get_current_user
from app.schemas.post import PostCreate, PostResponse
from app.crud.post import post_crud
from app.models.user import User
from app.database import get_db
from app.core.config import settings
from app.utils.tags import extract_tags
from app.core.translations import translate_text

router = APIRouter()


@router.post("/posts/", response_model=PostResponse)
async def create_post(
        content: Optional[str] = Form(None),
        file: Optional[UploadFile] = File(None),
        is_public: bool = Form(True),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Extract tags
    tags = extract_tags(content) if content else ""

    # Handle file upload
    media_url = None
    media_type = None

    if file and file.filename:
        # Create media directory
        os.makedirs(settings.MEDIA_FOLDER, exist_ok=True)

        # Save file
        file_location = f"{settings.MEDIA_FOLDER}/{current_user.id}_{file.filename}"
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())

        media_url = f"/media/{current_user.id}_{file.filename}"

        # Determine media type
        ext = os.path.splitext(file.filename)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png', '.gif']:
            media_type = detect_media_type(file.filename)
        elif ext in ['.mp4', '.avi', '.mov']:
            media_type = 'video'
        elif ext in ['.mp3', '.wav']:
            media_type = 'audio'

    # Create post data
    post_data = PostCreate(
        content=content,
        tags=tags,
        is_public=is_public
    )

    # Auto-translate content
    translations = {}
    if content:
        translations = await translate_text(content)

    # Create post
    post = post_crud.create_with_owner(
        db=db,
        obj_in=post_data,
        owner_id=current_user.id,
        translations=translations
    )

    # Update with media info
    if media_url:
        post.media_url = media_url
        post.media_type = media_type
        db.commit()
        db.refresh(post)

    return post


@router.get("/posts/", response_model=List[PostResponse])
async def read_posts(
        skip: int = 0,
        limit: int = 50,
        tag: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_current_user)
):
    # Vanilla feed: No algorithms, just chronological
    posts = post_crud.get_multi(db, skip=skip, limit=limit, tag=tag)
    return posts


@router.get("/posts/{post_id}", response_model=PostResponse)
async def read_post(
        post_id: int,
        db: Session = Depends(get_db)
):
    post = post_crud.get(db, id=post_id)
    if not post or not post.is_public:
        raise HTTPException(status_code=404, detail="Post not found")
    return post