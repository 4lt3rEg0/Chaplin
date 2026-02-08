from sqlalchemy.orm import Session
from typing import Optional
from app.models.post import Post
from app.schemas.post import PostCreate


class CRUDPost:
    def get(self, db: Session, id: int):
        return db.query(Post).filter(Post.id == id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, tag: Optional[str] = None):
        query = db.query(Post).filter(Post.is_public == True)

        if tag:
            query = query.filter(Post.tags.contains(f"#{tag}#"))

        return query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()

    def create_with_owner(self, db: Session, *, obj_in: PostCreate, owner_id: int, translations: Optional[dict] = None):
        db_obj = Post(
            **obj_in.model_dump(),
            owner_id=owner_id,
            translations=translations or {}
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, id: int, owner_id: int):
        obj = db.query(Post).filter(Post.id == id, Post.owner_id == owner_id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj


post_crud = CRUDPost()