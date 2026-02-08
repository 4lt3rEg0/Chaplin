from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
from app.database import Base


class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    media_type = Column(String, nullable=True)

    # Tags in '#tag#' format
    tags = Column(Text, nullable=True)

    # Privacy
    is_public = Column(Boolean, default=True)

    # Owner
    owner_id = Column(Integer, ForeignKey('users.id'))
    owner = relationship('User', back_populates='posts')

    # Translations
    translations = Column(JSON, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Comments
    comments = relationship('Comment', back_populates='post', cascade='all, delete-orphan')
