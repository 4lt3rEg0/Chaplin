from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser:
    def get(self, db: Session, id: int):
        return db.query(User).filter(User.id == id).first()

    def get_by_email(self, db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    def get_by_username(self, db: Session, username: str):
        return db.query(User).filter(User.username == username).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        # Check invitation if needed
        from app.core.config import settings
        if settings.INVITATION_ONLY:
            if obj_in.invitation_code not in settings.INVITATION_CODES:
                raise ValueError("Invalid invitation code")

        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            birth_date=obj_in.birth_date,
            hashed_password=get_password_hash(obj_in.password),
            social_goal=obj_in.social_goal,
            is_invited=True,
            invitation_code=obj_in.invitation_code
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # En la función authenticate, después de verificar password, AÑADE:

    def authenticate(self, db: Session, *, email: str, password: str):
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None

        user.last_login = datetime.now(timezone.utc)
        user.update_member_days()  # Actualizar días como miembro
        db.commit()
        db.refresh(user)

        return user

    def update(self, db: Session, *, db_obj: User, obj_in: UserUpdate):
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


user_crud = CRUDUser()