from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    birth_date: datetime


class UserCreate(UserBase):
    password: str
    social_goal: str
    invitation_code: Optional[str] = None

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    profile_public: bool
    radio_public: bool
    bio: Optional[str]
    social_goal: str

    # AÑADE estas 3 líneas:
    registration_date: datetime
    last_login: Optional[datetime]
    member_since_days: int

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    bio: Optional[str] = None
    profile_public: Optional[bool] = None
    radio_public: Optional[bool] = None