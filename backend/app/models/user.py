from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    birth_date = Column(DateTime, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Profile settings
    profile_public = Column(Boolean, default=True)
    radio_public = Column(Boolean, default=False)
    bio = Column(Text, nullable=True)

    # Registration question
    social_goal = Column(Text, nullable=False)

    # Invitations
    is_invited = Column(Boolean, default=False)
    invitation_code = Column(String, nullable=True)
    invitations_left = Column(Integer, default=3)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    posts = relationship("Post", back_populates="owner")
    comments = relationship("Comment", back_populates="owner")

    # Fecha de registro del usuario (para mostrar "Usuario desde X")
    registration_date = Column(DateTime(timezone=True), server_default=func.now())

    # Último login
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Días como miembro (calculado automáticamente)
    member_since_days = Column(Integer, default=0)

    # Método para actualizar días como miembro
    def update_member_days(self):
        if self.registration_date:
            delta = datetime.now(timezone.utc) - self.registration_date
            self.member_since_days = delta.days