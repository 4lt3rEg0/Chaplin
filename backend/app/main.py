from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
import shutil
from pathlib import Path
import re

# ========== CONFIGURACIÓN ==========
SECRET_KEY = "***REMOVED_SECRET***"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días
DATABASE_URL = "sqlite:///./chaplin.db"
MEDIA_FOLDER = "media"
INVITATION_CODES = ["CHA2024", "Y2KFM", "SPIRAL01", "CHA2024INV"]
DEFAULT_TAGS = ["Musica", "Arte", "Gaming", "Pelis", "Series", "Deporte", "Anime", "Moda", "Reflexiones"]

# ========== BASE DE DATOS ==========
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ========== MODELOS ==========
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    birth_date = Column(DateTime, nullable=False)
    hashed_password = Column(String, nullable=False)

    profile_public = Column(Boolean, default=True)
    radio_public = Column(Boolean, default=False)
    bio = Column(Text, nullable=True)
    social_goal = Column(Text, nullable=False)

    is_invited = Column(Boolean, default=False)
    invitation_code = Column(String, nullable=True)
    invitations_left = Column(Integer, default=3)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    posts = relationship("Post", back_populates="owner")
    comments = relationship("Comment", back_populates="owner")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    tags = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="posts")

    translations = Column(Text, nullable=True)  # JSON como string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    gif_url = Column(String, nullable=True)
    sticker_url = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="comments")

    post_id = Column(Integer, ForeignKey("posts.id"))
    post = relationship("Post", back_populates="comments")

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ========== ESQUEMAS PYDANTIC ==========
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


class UserResponse(UserBase):
    id: int
    profile_public: bool
    radio_public: bool
    bio: Optional[str]

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


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
    created_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    gif_url: Optional[str] = None
    sticker_url: Optional[str] = None


class CommentResponse(CommentCreate):
    id: int
    owner_id: int
    post_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== SEGURIDAD ==========
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ========== DEPENDENCIAS ==========
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


# ========== UTILIDADES ==========
def extract_tags(text: str) -> str:
    """Extrae tags en formato #tag# del texto"""
    if not text:
        return ""
    tags = re.findall(r'#([^#]+)#', text)
    unique_tags = list(dict.fromkeys(tags))
    return "#" + "# #".join(unique_tags) + "#" if unique_tags else ""


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mp3", ".wav"}


def allowed_file(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


# ========== APLICACIÓN FASTAPI ==========
app = FastAPI(
    title="Chaplin Social Network",
    description="Y2K Futurist Social Network without Algorithms",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router principal
api_router = APIRouter()


# ========== ENDPOINTS DE AUTENTICACIÓN ==========
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Verificar invitación
    if user_data.invitation_code not in INVITATION_CODES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Código de invitación inválido"
        )

    # Verificar si existe
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email o nombre de usuario ya registrado"
        )

    # Crear usuario
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        birth_date=user_data.birth_date,
        hashed_password=get_password_hash(user_data.password),
        social_goal=user_data.social_goal,
        is_invited=True,
        invitation_code=user_data.invitation_code
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@api_router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }


# ========== ENDPOINTS DE POSTS ==========
@api_router.post("/posts/", response_model=PostResponse)
async def create_post(
        content: Optional[str] = Form(None),
        file: Optional[UploadFile] = File(None),
        is_public: bool = Form(True),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Extraer tags
    tags = extract_tags(content) if content else ""

    # Manejar archivo
    media_url = None
    media_type = None

    if file and file.filename:
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de archivo no permitido"
            )

        # Crear directorio media si no existe
        os.makedirs(MEDIA_FOLDER, exist_ok=True)

        # Guardar archivo
        file_location = f"{MEDIA_FOLDER}/{current_user.id}_{file.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        media_url = f"/media/{current_user.id}_{file.filename}"

        # Determinar tipo
        ext = Path(file.filename).suffix.lower()
        if ext in ['.jpg', '.jpeg', '.png', '.gif']:
            media_type = 'image'
        elif ext in ['.mp4', '.avi', '.mov']:
            media_type = 'video'
        elif ext in ['.mp3', '.wav']:
            media_type = 'audio'

    # Crear post
    db_post = Post(
        content=content,
        media_url=media_url,
        media_type=media_type,
        tags=tags,
        is_public=is_public,
        owner_id=current_user.id
    )

    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@api_router.get("/posts/", response_model=List[PostResponse])
async def get_posts(
        skip: int = 0,
        limit: int = 50,
        tag: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_current_user)
):
    # Feed VANILLA: sin algoritmos, solo cronológico
    query = db.query(Post).filter(Post.is_public == True)

    if tag:
        query = query.filter(Post.tags.contains(f"#{tag}#"))

    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return posts


@api_router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post or not post.is_public:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return post


# ========== ENDPOINTS DE COMENTARIOS ==========
@api_router.post("/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
        post_id: int,
        comment: CommentCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Verificar post existe
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    # Crear comentario
    db_comment = Comment(
        content=comment.content,
        gif_url=comment.gif_url,
        sticker_url=comment.sticker_url,
        owner_id=current_user.id,
        post_id=post_id
    )

    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


@api_router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.desc()).all()
    return comments


# ========== ENDPOINTS DE USUARIOS ==========
@api_router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.profile_public == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@api_router.put("/users/me", response_model=UserResponse)
async def update_user(
        bio: Optional[str] = Form(None),
        profile_public: Optional[bool] = Form(None),
        radio_public: Optional[bool] = Form(None),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if bio is not None:
        current_user.bio = bio
    if profile_public is not None:
        current_user.profile_public = profile_public
    if radio_public is not None:
        current_user.radio_public = radio_public

    db.commit()
    db.refresh(current_user)
    return current_user


# ========== ENDPOINTS DE RADIO ==========
@api_router.get("/radio/stations")
async def get_radio_stations():
    return {
        "stations": [
            {"id": "global", "name": "Radio Global", "listeners": 15, "public": True},
            {"id": "electronic", "name": "Electronic Beats", "listeners": 8, "public": True},
            {"id": "y2k", "name": "Y2K Vibes", "listeners": 12, "public": True},
        ]
    }


@api_router.get("/radio/{station_id}/info")
async def get_radio_info(station_id: str):
    return {
        "station_id": station_id,
        "name": f"Radio {station_id.title()}",
        "description": "Estación de radio comunitaria de Chaplin",
        "current_song": "Y2K Future Bass - Unknown Artist",
        "listeners": 10,
        "tags": ["#Musica#", "#Y2K#", "#Futuro#"]
    }


# ========== ENDPOINTS DEL SISTEMA ==========
# Agrega esto ANTES de app.include_router:

@app.get("/")
async def root_direct():
    return {
        "message": "🎭 Welcome to Chaplin Social Network!",
        "version": "2.0.0",
        "features": [
            "Y2K Futurist Design",
            "Community Radio",
            "Spiral Feed",
            "No Recommendation Algorithms",
            "Auto-translation (coming soon)",
            "#Tag# System",
            "Media Upload (images, video, audio)"
        ],
        "api_endpoints": {
            "v1": "/api/v1/",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "default_tags": DEFAULT_TAGS
    }

# Y luego el endpoint dentro del router puede quedar como /api/v1/ o eliminarlo
@api_router.get("/")
async def root_api():
    return {"api": "v1", "status": "active"}


@api_router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Verificar conexión a DB
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "running",
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    }


@api_router.get("/tags")
async def get_tags():
    return {"tags": DEFAULT_TAGS}


# ========== CONFIGURACIÓN FINAL ==========
# Incluir router principal
app.include_router(api_router, prefix="/api/v1")


# Crear tablas de la base de datos al iniciar
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    os.makedirs(MEDIA_FOLDER, exist_ok=True)
    print("✅ Base de datos inicializada")
    print("✅ Carpeta media creada")


# Montar archivos estáticos
from fastapi.staticfiles import StaticFiles

app.mount("/media", StaticFiles(directory=MEDIA_FOLDER), name="media")

# ========== EJECUCIÓN ==========
if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("🚀 CHAPLIN SOCIAL NETWORK - Y2K Edition")
    print("=" * 50)
    print("🌐 Servidor: http://localhost:8000")
    print("📚 Documentación: http://localhost:8000/docs")
    print("🎵 Radio: http://localhost:8000/api/v1/radio/stations")
    print("🔑 Códigos de invitación:", ", ".join(INVITATION_CODES))
    print("=" * 50)

    # CORRECCIÓN: Pasar como string para reload
    uvicorn.run("app.main_original:app", host="0.0.0.0", port=8000, reload=True)