from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.crud.user import user_crud
from app.schemas.user import UserCreate, UserResponse
from app.database import get_db

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if user_crud.get_by_email(db, email=user_data.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    if user_crud.get_by_username(db, username=user_data.username):
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )

    # Create user
    user = user_crud.create(db=db, obj_in=user_data)
    return user


@router.post("/login")
async def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)
):
    user = user_crud.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }