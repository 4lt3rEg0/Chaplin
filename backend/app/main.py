from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, ForeignKey, text, UniqueConstraint, or_
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
import json
from pathlib import Path
import re
import secrets
import uuid
from dotenv import load_dotenv

# Load backend/.env (if present) into os.environ before reading any config
# below. python-dotenv never overrides a variable already set in the real
# environment, so an explicit `SECRET_KEY=... uvicorn ...` still wins over
# whatever is in this file — this is purely a convenience for local dev so a
# secret doesn't have to be exported by hand in every terminal.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ========== CONFIGURACIÓN ==========
# Absolute, deterministic resolution based on this file's own location — NOT the
# current working directory. This has always been stable regardless of where
# uvicorn is launched from; the historical "duplicate DB/media" confusion came
# from a stale committed copy under backend/, not from path ambiguity at runtime.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "chaplin.db"

# Runtime version fingerprint, exposed (in non-sensitive form) via /health so
# whoever is testing can immediately answer "am I actually running the code I
# just saved?" instead of assuming a process picked up a recent edit. Never
# expose an absolute filesystem path, git state, or env vars here — just a
# timestamp-derived marker (see CHAPLIN — BETA HARDENING CONTINUATION V5, Fase I).
_PROCESS_STARTED_AT = datetime.utcnow().isoformat()
_MAIN_PY_MTIME = datetime.utcfromtimestamp(Path(__file__).stat().st_mtime).isoformat()

# SECURITY: never ship a hardcoded fallback secret in source — anyone who reads
# this file could forge valid JWTs for any user.
#
# CHAPLIN_ENV distinguishes "I'm iterating locally" from "real users are
# depending on this staying up" — a random per-process secret invalidates
# every existing session on every restart, which is fine while developing
# alone but unacceptable once anyone else has a login that must survive a
# routine restart. CHAPLIN_SECRET_KEY/SECRET_KEY are equivalent; the former
# matches this project's CHAPLIN_* naming convention, the latter is kept for
# the .env file that already existed before this variable was introduced.
CHAPLIN_ENV = os.getenv("CHAPLIN_ENV", "development").strip().lower()
SECRET_KEY = os.getenv("CHAPLIN_SECRET_KEY") or os.getenv("SECRET_KEY")
_DEV_SECRET_FILE = PROJECT_ROOT / ".chaplin_dev_secret"

if not SECRET_KEY:
    if CHAPLIN_ENV in ("beta", "production", "prod"):
        raise RuntimeError(
            f"CHAPLIN_ENV='{CHAPLIN_ENV}' requiere una CHAPLIN_SECRET_KEY explicita y "
            "persistente (no se genera una aleatoria en este modo, porque invalidaria "
            "todas las sesiones en cada reinicio). Configura la variable de entorno "
            "antes de arrancar."
        )
    # Development only: generate once and persist locally (never committed —
    # see .gitignore) so restarting the dev server doesn't log everyone out.
    if _DEV_SECRET_FILE.is_file():
        SECRET_KEY = _DEV_SECRET_FILE.read_text().strip() or None
    if not SECRET_KEY:
        SECRET_KEY = secrets.token_hex(32)
        try:
            _DEV_SECRET_FILE.write_text(SECRET_KEY)
        except OSError:
            pass
    print(
        f"[AVISO] CHAPLIN_SECRET_KEY no configurada - usando un secreto de desarrollo "
        f"persistido en {_DEV_SECRET_FILE.name} (no se sube a git, estable entre "
        "reinicios). Configura CHAPLIN_SECRET_KEY en el entorno antes de desplegar una "
        "beta real (CHAPLIN_ENV=beta exige esto explicitamente)."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 30)))

# CHAPLIN_DB_PATH / CHAPLIN_MEDIA_ROOT are the preferred, explicitly-named
# overrides; DATABASE_URL / MEDIA_FOLDER are kept for backward compatibility
# with existing scripts/deployments that may already set them.
_chaplin_db_path = os.getenv("CHAPLIN_DB_PATH")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{Path(_chaplin_db_path).resolve().as_posix()}" if _chaplin_db_path
    else f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
)
MEDIA_FOLDER = Path(os.getenv("CHAPLIN_MEDIA_ROOT") or os.getenv("MEDIA_FOLDER") or str(PROJECT_ROOT / "media"))
INVITATION_CODES = ["CHA2024", "Y2KFM", "SPIRAL01", "CHA2024INV"]
DEFAULT_TAGS = ["Musica", "Arte", "Gaming", "Pelis", "Series", "Deporte", "Anime", "Moda", "Reflexiones"]

# Professional/creative identity chosen at signup (Fase 1 of the roles
# system — see frontend/web/src/constants/roles.js, which MUST stay in
# sync with this list). "user"/"artist" are the original two cosmetic
# values kept valid so existing accounts never need a data migration;
# "artist" is treated as a legacy alias of "musico", not migrated in
# place. No permission is gated on any of these yet — still purely a
# profile identity, same as the original comment on User.role said.
ROLE_OPTIONS = {
    "user", "artist",
    "casual", "musico", "escritor", "dibujante_tatuador", "fotografia_cine",
    "moda", "comedia", "periodismo", "ciencia", "it", "gaming", "sanidad",
    "farmaceutica", "psicologia", "veterinaria", "derecho", "politica",
    "seguridad", "magisterio", "negocios", "finanzas",
    "arquitectura_construccion", "automocion", "agricultura",
    "belleza_estetica", "deporte", "gastronomia", "espiritualidad",
    "modelos", "modelos_adultos", "otro",
}

# ========== BASE DE DATOS ==========
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
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
    avatar_url = Column(String, nullable=True)
    # Cosmetic distinction only — no permission is gated on this (uploading
    # music/video/images already works for every authenticated user). It just
    # lets the profile UI show an "artist" identity/badge.
    role = Column(String, default="user", nullable=False)
    # Free text, only meaningful when role == "otro" — lets someone whose
    # profession isn't in ROLE_OPTIONS yet self-identify anyway.
    role_other = Column(String, nullable=True)
    # Touched (throttled) on authenticated requests — powers a simple
    # "online now" indicator without a WebSocket presence system.
    last_seen = Column(DateTime(timezone=True), nullable=True)
    presence_status = Column(String, default="online", nullable=False)  # "online" | "away" | "invisible"
    social_goal = Column(Text, nullable=False)
    # What plays in this user's profile player when a visitor taps the ear icon.
    # "all" (every public track) | "favorites" (only Track.is_favorited=True) |
    # "radio" (the global Radio Chaplin source instead of personal tracks).
    profile_playback_mode = Column(String, default="all", nullable=False)
    # JSON-encoded blob (theme/skin/background/visualizer settings). Kept as a single
    # column instead of one-per-field so the client's preference shape can evolve
    # without further schema migrations.
    preferences = Column(Text, nullable=True)

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
    # Indexed: /media/{filename} looks up the owning Post by this column on
    # every request (including every Range sub-request during audio seek).
    media_url = Column(String, nullable=True, index=True)
    media_type = Column(String, nullable=True)
    tags = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="posts")

    # Optional soundtrack chosen in the editor before publishing — always one
    # of the owner's own Tracks, never a duplicated/moved media file.
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=True)
    track = relationship("Track", foreign_keys=[track_id])

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


# ========== MODELOS DE MÚSICA (Track / Playlist) ==========
# Minimal, additive schema: audio stops being defined solely by
# `Post.media_type == "audio"`. A Track can reference an existing Post
# (`source_post_id`) to preserve history without duplicating/moving any media file.
class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User")

    title = Column(String, nullable=False)
    # Indexed for the same reason as Post.media_url — see /media/{filename}.
    media_url = Column(String, nullable=False, index=True)
    artwork_url = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds; nullable until known
    visibility = Column(String, default="public", nullable=False)  # "public" | "private"
    # "personal" (default — artist's own music only) | "pending" (submitted to
    # Chaplin Radio, awaiting a curator) | "approved" | "rejected". Submitting
    # never auto-adds to the chaplin_radio playlist — only a curator approval does.
    radio_status = Column(String, default="personal", nullable=False)
    # Marked by the owner as a favorite — real playback effect (not cosmetic):
    # gates which tracks play when profile_playback_mode == "favorites".
    is_favorited = Column(Boolean, default=False, nullable=False)

    # Preserves the historical link to the audio Post it was backfilled from, if any.
    # Never used to duplicate or move the underlying media file.
    source_post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    source_post = relationship("Post", foreign_keys=[source_post_id])

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User")

    name = Column(String, nullable=False)
    # "personal" (private, per-user) | "profile" (public, one per user, shown to visitors)
    # | "chaplin_radio" (public, curated, restricted to authorized owners)
    kind = Column(String, default="personal", nullable=False)
    visibility = Column(String, default="private", nullable=False)  # "public" | "private"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship(
        "PlaylistItem",
        back_populates="playlist",
        order_by="PlaylistItem.position",
        cascade="all, delete-orphan"
    )


class PlaylistItem(Base):
    __tablename__ = "playlist_items"
    __table_args__ = (UniqueConstraint("playlist_id", "track_id", name="uq_playlist_track"),)

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    playlist = relationship("Playlist", back_populates="items")

    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    track = relationship("Track")

    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


# ========== LIKES (Post / Comment) ==========
class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_like"),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CommentLike(Base):
    __tablename__ = "comment_likes"
    __table_args__ = (UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),)

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ========== SEGUIR USUARIOS (Follow) ==========
# Deliberately a simple, one-directional follow (like Twitter/Instagram) —
# no accept/reject request state machine, which is a much bigger feature
# (pending state, notifications) than what was actually asked for here.
class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "followed_id", name="uq_follow_pair"),)

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    followed_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ========== MENSAJERÍA DIRECTA (DM) ==========
# Deliberately minimal: one Conversation per unique pair of users (no group
# chats), plain-text Messages, no real-time transport (frontend polls) — a
# real, working baseline rather than the previous "Bandeja DM en construccion"
# placeholder alert, not a full messaging platform.
class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_conversation_pair"),)

    id = Column(Integer, primary_key=True, index=True)
    # Canonical ordering (user_a_id < user_b_id) enforced at creation time so
    # A-then-B and B-then-A never create two separate conversations.
    user_a_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_b_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_a = relationship("User", foreign_keys=[user_a_id])
    user_b = relationship("User", foreign_keys=[user_b_id])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    messages = relationship(
        "Message", back_populates="conversation",
        order_by="Message.id", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    conversation = relationship("Conversation", back_populates="messages")

    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender = relationship("User")

    content = Column(Text, nullable=False)
    message_type = Column(String, default="text", nullable=False)  # "text" | "nudge"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    reactions = relationship("MessageReaction", cascade="all, delete-orphan")


class MessageReaction(Base):
    __tablename__ = "message_reactions"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_reaction_user"),)

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, nullable=False)
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
    role: str = "casual"
    role_other: Optional[str] = None


class UserResponse(UserBase):
    id: int
    profile_public: bool
    radio_public: bool
    bio: Optional[str]
    avatar_url: Optional[str] = None
    role: str = "user"
    role_other: Optional[str] = None
    preferences: Optional[str] = None
    profile_playback_mode: str = "all"
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    status: str = "offline"

    class Config:
        from_attributes = True


class PublicUserResponse(BaseModel):
    """Safe subset of UserResponse for endpoints anyone can hit without auth.

    Deliberately excludes `email` and `preferences` (raw JSON blob) — see the
    same whitelist rule already enforced for /users/{user_id}/environment.
    UserResponse itself must stay reserved for /users/me (the authenticated
    owner looking at their own record).
    """
    id: int
    username: str
    first_name: str
    last_name: str
    profile_public: bool
    radio_public: bool
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"
    role_other: Optional[str] = None
    profile_playback_mode: str = "all"
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    is_following: bool = False
    is_online: bool = False
    status: str = "offline"

    class Config:
        from_attributes = True


class FollowUserResponse(BaseModel):
    """Compact user summary for followers/following list rows."""
    id: int
    username: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    is_online: bool = False


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
    owner_username: Optional[str] = None
    created_at: datetime
    like_count: int = 0
    liked_by_me: bool = False
    track_id: Optional[int] = None
    track_title: Optional[str] = None
    track_media_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    gif_url: Optional[str] = None
    sticker_url: Optional[str] = None


class CommentResponse(CommentCreate):
    id: int
    owner_id: int
    owner_username: Optional[str] = None
    post_id: int
    created_at: datetime
    like_count: int = 0
    liked_by_me: bool = False

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str


class MessageReactionSummary(BaseModel):
    emoji: str
    count: int
    reacted_by_me: bool = False


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: str = "text"
    created_at: datetime
    read_at: Optional[datetime] = None
    reactions: List[MessageReactionSummary] = []

    class Config:
        from_attributes = True


class ReactionCreate(BaseModel):
    emoji: str


class ConversationCreate(BaseModel):
    username: str


class ConversationResponse(BaseModel):
    id: int
    other_user_id: int
    other_username: str
    other_avatar_url: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class TrackResponse(BaseModel):
    id: int
    owner_id: int
    owner_username: Optional[str] = None
    title: str
    media_url: str
    artwork_url: Optional[str] = None
    duration: Optional[int] = None
    visibility: str
    radio_status: str = "personal"
    is_favorited: bool = False
    source_post_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrackFromPostCreate(BaseModel):
    title: Optional[str] = None
    visibility: str = "public"


class TrackUpdate(BaseModel):
    title: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: Optional[int] = None
    visibility: Optional[str] = None
    is_favorited: Optional[bool] = None


class PlaylistResponse(BaseModel):
    id: int
    owner_id: int
    owner_username: Optional[str] = None
    name: str
    kind: str
    visibility: str
    created_at: datetime
    tracks: List[TrackResponse] = []

    class Config:
        from_attributes = True


class ProfilePlaybackResponse(BaseModel):
    """Resolved source for a profile's player: which mode is active and the
    actual track list that mode plays, so the frontend never re-implements
    the all/favorites/radio selection logic itself."""
    mode: str  # "all" | "favorites" | "radio"
    owner_username: str
    tracks: List[TrackResponse] = []


class PlaylistCreate(BaseModel):
    name: str
    kind: str = "personal"
    visibility: str = "private"


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    visibility: Optional[str] = None


class PlaylistItemCreate(BaseModel):
    track_id: int


class PlaylistReorder(BaseModel):
    track_ids: List[int]


# ========== SEGURIDAD ==========
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


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

    _touch_last_seen(db, user)
    return user


def _touch_last_seen(db: Session, user: "User") -> None:
    """Throttled last_seen bump shared by both auth dependencies — a write on
    every single request would be wasteful, so only bump if stale by more
    than a minute (see ONLINE_WINDOW_SECONDS for the "online now" cutoff)."""
    now = datetime.utcnow()
    if user.last_seen is None or (now - user.last_seen).total_seconds() > 60:
        user.last_seen = now
        db.commit()


def get_optional_current_user(db: Session = Depends(get_db), token: Optional[str] = Depends(optional_oauth2_scheme)):
    """Like get_current_user, but returns None instead of raising 401 when there's
    no (or an invalid) token — for endpoints that are public for public content
    but still need to recognize the owner viewing their own private content."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is not None:
        _touch_last_seen(db, user)
    return user


# ========== UTILIDADES ==========
def extract_tags(text: str) -> str:
    """Extrae tags en formato #tag# del texto"""
    if not text:
        return ""
    tags = re.findall(r'#([^#]+)#', text)
    unique_tags = list(dict.fromkeys(tags))
    return "#" + "# #".join(unique_tags) + "#" if unique_tags else ""


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mp3", ".wav"}
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("CHAPLIN_MAX_UPLOAD_MB", "50")) * 1024 * 1024
MAX_PREFERENCES_BYTES = 32 * 1024
ONLINE_WINDOW_SECONDS = 120
AWAY_WINDOW_SECONDS = 900
VALID_PRESENCE_STATUSES = ("online", "away", "invisible")


def allowed_file(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


async def _save_uploaded_file(file: UploadFile, owner_id: int) -> str:
    """Shared upload path for post media and avatar uploads: validates the
    extension, sniffs magic bytes against a spoofed extension, streams to disk
    with a size cap, and never trusts the client-supplied filename for the
    stored path. Returns the public /media/... URL. Raises HTTPException on
    any validation failure, cleaning up any partial file first."""
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

    safe_ext = Path(file.filename).suffix.lower()
    stored_filename = f"{owner_id}_{uuid.uuid4().hex}{safe_ext}"

    MEDIA_FOLDER.mkdir(parents=True, exist_ok=True)
    file_location = MEDIA_FOLDER / stored_filename
    bytes_written = 0
    try:
        with open(file_location, "wb") as buffer:
            first_chunk = True
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                if first_chunk:
                    if not _content_matches_extension(chunk, safe_ext):
                        raise HTTPException(
                            status_code=400,
                            detail="El contenido del archivo no coincide con su extensión"
                        )
                    first_chunk = False
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Archivo demasiado grande (máx. {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB)"
                    )
                buffer.write(chunk)
        if bytes_written == 0:
            raise HTTPException(status_code=400, detail="El archivo esta vacio")
    except HTTPException:
        file_location.unlink(missing_ok=True)
        raise
    except Exception:
        file_location.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="No se pudo procesar el archivo subido")

    return f"/media/{stored_filename}"


def _media_type_for_ext(ext: str) -> Optional[str]:
    if ext in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
        return 'image'
    if ext in ('.mp4', '.avi', '.mov'):
        return 'video'
    if ext in ('.mp3', '.wav'):
        return 'audio'
    return None


def _effective_status(user: "User") -> str:
    """Combines the user's manual presence preference with real activity:
    'invisible'/'away' preferences always win; the default 'online'
    preference is auto-derived from last_seen (online -> away -> offline as
    it goes stale), matching how Discord/WhatsApp-style presence behaves."""
    preference = user.presence_status or "online"
    if preference == "invisible":
        return "offline"
    if preference == "away":
        return "away"
    if not user.last_seen:
        return "offline"
    elapsed = (datetime.utcnow() - user.last_seen).total_seconds()
    if elapsed < ONLINE_WINDOW_SECONDS:
        return "online"
    if elapsed < AWAY_WINDOW_SECONDS:
        return "away"
    return "offline"


def _is_online(user: "User") -> bool:
    return _effective_status(user) == "online"


def _follower_count(db: Session, user_id: int) -> int:
    return db.query(Follow).filter(Follow.followed_id == user_id).count()


def _following_count(db: Session, user_id: int) -> int:
    return db.query(Follow).filter(Follow.follower_id == user_id).count()


def _post_count(db: Session, user_id: int, public_only: bool) -> int:
    query = db.query(Post).filter(Post.owner_id == user_id)
    if public_only:
        query = query.filter(Post.is_public == True)
    return query.count()


def _serialize_user(user: "User", db: Session) -> UserResponse:
    """For the authenticated owner's own view (/users/me, register, login,
    avatar upload, profile update) — includes email/preferences, which is
    correct here because it's always the owner looking at their own record."""
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        birth_date=user.birth_date,
        profile_public=user.profile_public,
        radio_public=user.radio_public,
        bio=user.bio,
        avatar_url=user.avatar_url,
        role=user.role,
        role_other=user.role_other,
        preferences=user.preferences,
        profile_playback_mode=user.profile_playback_mode,
        follower_count=_follower_count(db, user.id),
        following_count=_following_count(db, user.id),
        post_count=_post_count(db, user.id, public_only=False),
        status=_effective_status(user),
    )


def _serialize_public_user(user: "User", viewer: Optional["User"], db: Session) -> PublicUserResponse:
    is_following = (
        viewer is not None
        and db.query(Follow).filter(Follow.follower_id == viewer.id, Follow.followed_id == user.id).first() is not None
    )
    return PublicUserResponse(
        id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        profile_public=user.profile_public,
        radio_public=user.radio_public,
        bio=user.bio,
        avatar_url=user.avatar_url,
        role=user.role,
        role_other=user.role_other,
        profile_playback_mode=user.profile_playback_mode,
        follower_count=_follower_count(db, user.id),
        following_count=_following_count(db, user.id),
        post_count=_post_count(db, user.id, public_only=True),
        is_following=is_following,
        is_online=_is_online(user),
        status=_effective_status(user),
    )


def _serialize_post(post: "Post", current_user: Optional["User"], db: Session) -> PostResponse:
    like_count = db.query(PostLike).filter(PostLike.post_id == post.id).count()
    liked_by_me = (
        current_user is not None
        and db.query(PostLike).filter(PostLike.post_id == post.id, PostLike.user_id == current_user.id).first() is not None
    )
    return PostResponse(
        id=post.id,
        content=post.content,
        tags=post.tags,
        is_public=post.is_public,
        media_url=post.media_url,
        media_type=post.media_type,
        owner_id=post.owner_id,
        owner_username=post.owner.username if post.owner else None,
        created_at=post.created_at,
        like_count=like_count,
        liked_by_me=liked_by_me,
        track_id=post.track_id,
        track_title=post.track.title if post.track else None,
        track_media_url=post.track.media_url if post.track else None,
    )


def _serialize_comment(comment: "Comment", current_user: Optional["User"], db: Session) -> CommentResponse:
    like_count = db.query(CommentLike).filter(CommentLike.comment_id == comment.id).count()
    liked_by_me = (
        current_user is not None
        and db.query(CommentLike).filter(CommentLike.comment_id == comment.id, CommentLike.user_id == current_user.id).first() is not None
    )
    return CommentResponse(
        id=comment.id,
        content=comment.content,
        gif_url=comment.gif_url,
        sticker_url=comment.sticker_url,
        owner_id=comment.owner_id,
        owner_username=comment.owner.username if comment.owner else None,
        post_id=comment.post_id,
        created_at=comment.created_at,
        like_count=like_count,
        liked_by_me=liked_by_me,
    )


def _content_matches_extension(head: bytes, ext: str) -> bool:
    """Light magic-byte sniff — not a virus scanner, just enough to catch a
    renamed .txt/.exe pretending to be media via its extension. Only checks
    the handful of formats in ALLOWED_EXTENSIONS."""
    if ext in (".jpg", ".jpeg"):
        return head.startswith(b"\xff\xd8\xff")
    if ext == ".png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == ".gif":
        return head.startswith((b"GIF87a", b"GIF89a"))
    if ext == ".mp4":
        return len(head) >= 8 and head[4:8] == b"ftyp"
    if ext == ".wav":
        return head.startswith(b"RIFF") and len(head) >= 12 and head[8:12] == b"WAVE"
    if ext == ".mp3":
        if head.startswith(b"ID3"):
            return True
        # Raw MPEG frame sync: 11 set bits (0xFF followed by top 3 bits set).
        return len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0
    return True


# ========== APLICACIÓN FASTAPI ==========
app = FastAPI(
    title="Chaplin Social Network",
    description="Y2K Futurist Social Network without Algorithms",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — dev default stays permissive (localhost/any origin) for local work, but
# a beta/production deployment must set CHAPLIN_ALLOWED_ORIGINS explicitly.
# `allow_origins=["*"]` combined with `allow_credentials=True` is invalid per the
# CORS spec (browsers should refuse to send credentials to a wildcard origin) —
# harmless for local dev where no real cross-origin credentialed traffic exists,
# but not something to carry into a real deployment.
_allowed_origins_env = os.getenv("CHAPLIN_ALLOWED_ORIGINS")
_cors_origins = [origin.strip() for origin in _allowed_origins_env.split(",") if origin.strip()] if _allowed_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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

    if user_data.role not in ROLE_OPTIONS:
        raise HTTPException(status_code=422, detail=f"role debe ser uno de {sorted(ROLE_OPTIONS)}")

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
        role=user_data.role,
        role_other=user_data.role_other if user_data.role == "otro" else None,
        is_invited=True,
        invitation_code=user_data.invitation_code
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return _serialize_user(db_user, db)


@api_router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        user = db.query(User).filter(User.username == form_data.username).first()

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
        "user": _serialize_user(user, db)
    }


# ========== ENDPOINTS DE POSTS ==========
def _resolve_owned_track(db: Session, current_user: "User", track_id: Optional[int]) -> Optional["Track"]:
    if track_id is None:
        return None
    track = db.query(Track).filter(Track.id == track_id, Track.owner_id == current_user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Cancion no encontrada")
    return track


@api_router.post("/posts/", response_model=PostResponse)
async def create_post(
        content: Optional[str] = Form(None),
        file: Optional[UploadFile] = File(None),
        is_public: bool = Form(True),
        track_id: Optional[int] = Form(None),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    tags = extract_tags(content) if content else ""

    media_url = None
    media_type = None
    if file and file.filename:
        media_url = await _save_uploaded_file(file, current_user.id)
        media_type = _media_type_for_ext(Path(file.filename).suffix.lower())

    track = _resolve_owned_track(db, current_user, track_id)

    db_post = Post(
        content=content,
        media_url=media_url,
        media_type=media_type,
        tags=tags,
        is_public=is_public,
        owner_id=current_user.id,
        track_id=track.id if track else None
    )

    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return _serialize_post(db_post, current_user, db)


@api_router.get("/posts/", response_model=List[PostResponse])
async def get_posts(
        skip: int = 0,
        limit: int = 50,
        tag: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Feed VANILLA: sin algoritmos, solo cronológico
    query = db.query(Post).filter(Post.is_public == True)

    if tag:
        query = query.filter(Post.tags.contains(f"#{tag}#"))

    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [_serialize_post(p, current_user, db) for p in posts]


@api_router.get("/posts/by-user/{username}", response_model=List[PostResponse])
async def list_user_posts(
        username: str,
        media: Optional[str] = None,  # "media" -> image/video only, "text" -> text-only (bitacora), None -> all
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    owner = db.query(User).filter(User.username == username).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    is_owner = current_user is not None and current_user.id == owner.id
    if not is_owner and not owner.profile_public:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    query = db.query(Post).filter(Post.owner_id == owner.id)
    if not is_owner:
        query = query.filter(Post.is_public == True)
    if media == "media":
        query = query.filter(Post.media_type.in_(["image", "video"]))
    elif media == "text":
        query = query.filter(Post.media_type.is_(None))

    posts = query.order_by(Post.created_at.desc()).all()
    return [_serialize_post(p, current_user, db) for p in posts]


@api_router.get("/posts/search", response_model=List[PostResponse])
async def search_posts(
        q: str = Query(..., min_length=1, max_length=100),
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Registered before /posts/{post_id} — same int-coercion reasoning as
    # /posts/by-user/{username} above.
    like = f"%{q.strip()}%"
    posts = (
        db.query(Post)
        .filter(Post.is_public == True, Post.content.ilike(like))
        .order_by(Post.created_at.desc())
        .limit(30)
        .all()
    )
    return [_serialize_post(p, current_user, db) for p in posts]


@api_router.get("/tags/search")
async def search_tags(q: str = Query(..., min_length=1, max_length=50), db: Session = Depends(get_db)):
    like = f"%{q.strip()}%"
    rows = db.query(Post.tags).filter(Post.is_public == True, Post.tags.ilike(like)).all()
    counts = {}
    needle = q.strip().lower()
    for (tags_str,) in rows:
        if not tags_str:
            continue
        for tag in re.findall(r'#([^#]+)#', tags_str):
            if needle in tag.lower():
                counts[tag] = counts.get(tag, 0) + 1
    top = sorted(counts.items(), key=lambda kv: -kv[1])[:20]
    return [{"tag": tag, "count": count} for tag, count in top]


@api_router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
        post_id: int,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    is_owner = current_user is not None and post is not None and post.owner_id == current_user.id
    if not post or (not post.is_public and not is_owner):
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return _serialize_post(post, current_user, db)


@api_router.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(
        post_id: int,
        content: Optional[str] = Form(None),
        is_public: Optional[bool] = Form(None),
        remove_media: bool = Form(False),
        file: Optional[UploadFile] = File(None),
        track_id: Optional[int] = Form(None),
        remove_track: bool = Form(False),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    if content is not None:
        post.content = content
        post.tags = extract_tags(content)
    if is_public is not None:
        post.is_public = is_public

    if track_id is not None:
        track = _resolve_owned_track(db, current_user, track_id)
        post.track_id = track.id if track else None
    elif remove_track:
        post.track_id = None

    # Editing the attached media itself — replace it with a new upload, or
    # drop it entirely. The old file on disk is left alone (same reasoning as
    # delete_post: an orphaned file is harmless, deleting real media on a
    # code path with edge cases is not worth the risk).
    if file and file.filename:
        post.media_url = await _save_uploaded_file(file, current_user.id)
        post.media_type = _media_type_for_ext(Path(file.filename).suffix.lower())
    elif remove_media:
        post.media_url = None
        post.media_type = None

    db.commit()
    db.refresh(post)
    return _serialize_post(post, current_user, db)


@api_router.delete("/posts/{post_id}")
async def delete_post(
        post_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Deliberately does not delete the underlying media file — an orphaned
    # file on disk is harmless; deleting real user media on a code path that
    # could have edge-case bugs is not an acceptable trade-off.
    db.query(PostLike).filter(PostLike.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"deleted": True}


@api_router.post("/posts/{post_id}/like", response_model=PostResponse)
async def toggle_post_like(
        post_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    is_owner = post is not None and post.owner_id == current_user.id
    if not post or (not post.is_public and not is_owner):
        raise HTTPException(status_code=404, detail="Post no encontrado")

    existing = db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
    db.commit()
    return _serialize_post(post, current_user, db)


# ========== ENDPOINTS DE COMENTARIOS ==========
@api_router.post("/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
        post_id: int,
        comment: CommentCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Same visibility rule as GET /posts/{post_id} — the owner can always
    # comment on their own post even while it's private.
    post = db.query(Post).filter(Post.id == post_id).first()
    is_owner = post is not None and post.owner_id == current_user.id
    if not post or (not post.is_public and not is_owner):
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
    return _serialize_comment(db_comment, current_user, db)


@api_router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(
        post_id: int,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Same visibility rule as the post itself — comments on a private post are
    # not a public side-channel just because the comment endpoint has no gate.
    # The owner can still read comments on their own private post.
    post = db.query(Post).filter(Post.id == post_id).first()
    is_owner = current_user is not None and post is not None and post.owner_id == current_user.id
    if not post or (not post.is_public and not is_owner):
        raise HTTPException(status_code=404, detail="Post no encontrado")
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.desc()).all()
    return [_serialize_comment(c, current_user, db) for c in comments]


@api_router.post("/comments/{comment_id}/like", response_model=CommentResponse)
async def toggle_comment_like(
        comment_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    is_owner = post is not None and post.owner_id == current_user.id
    if not post or (not post.is_public and not is_owner):
        raise HTTPException(status_code=404, detail="Comentario no encontrado")

    existing = db.query(CommentLike).filter(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(CommentLike(comment_id=comment_id, user_id=current_user.id))
    db.commit()
    return _serialize_comment(comment, current_user, db)


# ========== ENDPOINTS DE MÚSICA (Track / Playlist) ==========
# Usernames allowed to manage the curated "chaplin_radio" playlist. Mirrors the
# existing INVITATION_CODES-style hardcoded allowlist pattern already used in
# this file rather than introducing a full roles/permissions system.
RADIO_CURATORS = {"root", "testchaplin"}


def _serialize_track(track: "Track") -> TrackResponse:
    return TrackResponse(
        id=track.id,
        owner_id=track.owner_id,
        owner_username=track.owner.username if track.owner else None,
        title=track.title,
        media_url=track.media_url,
        artwork_url=track.artwork_url,
        duration=track.duration,
        visibility=track.visibility,
        radio_status=track.radio_status,
        is_favorited=track.is_favorited,
        source_post_id=track.source_post_id,
        created_at=track.created_at
    )


def _serialize_playlist(playlist: "Playlist", only_public_tracks: bool = False) -> PlaylistResponse:
    ordered_items = sorted(playlist.items, key=lambda item: item.position)
    if only_public_tracks:
        # A playlist being public doesn't make every track inside it public — the
        # owner may have flipped a track back to private after adding it. Public
        # read paths (profile playlist, chaplin radio) must re-check each track's
        # own visibility rather than trusting the playlist's visibility alone.
        ordered_items = [item for item in ordered_items if item.track and item.track.visibility == "public"]
    return PlaylistResponse(
        id=playlist.id,
        owner_id=playlist.owner_id,
        owner_username=playlist.owner.username if playlist.owner else None,
        name=playlist.name,
        kind=playlist.kind,
        visibility=playlist.visibility,
        created_at=playlist.created_at,
        tracks=[_serialize_track(item.track) for item in ordered_items]
    )


@api_router.get("/tracks/", response_model=List[TrackResponse])
async def list_public_tracks(db: Session = Depends(get_db)):
    tracks = db.query(Track).filter(Track.visibility == "public").order_by(Track.created_at.desc()).limit(200).all()
    return [_serialize_track(t) for t in tracks]


@api_router.get("/tracks/mine", response_model=List[TrackResponse])
async def list_my_tracks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tracks = db.query(Track).filter(Track.owner_id == current_user.id).order_by(Track.created_at.desc()).all()
    return [_serialize_track(t) for t in tracks]


@api_router.get("/tracks/by-user/{username}", response_model=List[TrackResponse])
async def list_user_public_tracks(username: str, db: Session = Depends(get_db)):
    owner = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    tracks = (
        db.query(Track)
        .filter(Track.owner_id == owner.id, Track.visibility == "public")
        .order_by(Track.created_at.desc())
        .all()
    )
    return [_serialize_track(t) for t in tracks]


@api_router.get("/tracks/search", response_model=List[TrackResponse])
async def search_tracks(q: str = Query(..., min_length=1, max_length=100), db: Session = Depends(get_db)):
    # Registered before /tracks/{track_id} — same int-coercion reasoning as
    # /posts/search above.
    like = f"%{q.strip()}%"
    tracks = (
        db.query(Track)
        .filter(Track.visibility == "public", Track.title.ilike(like))
        .order_by(Track.created_at.desc())
        .limit(30)
        .all()
    )
    return [_serialize_track(t) for t in tracks]


@api_router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(
        track_id: int,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    track = db.query(Track).filter(Track.id == track_id).first()
    is_owner = current_user is not None and track is not None and track.owner_id == current_user.id
    if not track or (track.visibility != "public" and not is_owner):
        raise HTTPException(status_code=404, detail="Track no encontrado")
    return _serialize_track(track)


@api_router.post("/tracks/from-post/{post_id}", response_model=TrackResponse)
async def create_track_from_post(
        post_id: int,
        payload: TrackFromPostCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Idempotent: linking the same Post twice returns the existing Track instead
    # of creating a duplicate. Never copies, moves, or renames the media file.
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el propietario del post puede convertirlo en Track")
    if post.media_type != "audio" or not post.media_url:
        raise HTTPException(status_code=400, detail="El post no es un adjunto de audio")

    existing = db.query(Track).filter(Track.source_post_id == post_id).first()
    if existing:
        return _serialize_track(existing)

    title = (payload.title or post.content or "").strip()[:120] or "Untitled Track"
    track = Track(
        owner_id=current_user.id,
        title=title,
        media_url=post.media_url,
        visibility=payload.visibility if payload.visibility in ("public", "private") else "public",
        source_post_id=post.id
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    return _serialize_track(track)


@api_router.post("/tracks/upload", response_model=TrackResponse)
async def upload_track(
        file: UploadFile = File(...),
        title: str = Form(...),
        artwork: Optional[UploadFile] = File(None),
        target: str = Form("personal"),  # "personal" | "radio"
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """Direct music upload for the artist profile — no longer requires
    detouring through a Post first. `target` is the artist's own conscious
    choice: "personal" keeps it in their own music only; "radio" submits it
    to Chaplin Radio as a pending curator review (never auto-added)."""
    if not file.filename or _media_type_for_ext(Path(file.filename).suffix.lower()) != "audio":
        raise HTTPException(status_code=400, detail="El archivo debe ser un audio válido (mp3/wav)")

    clean_title = title.strip()[:120]
    if not clean_title:
        raise HTTPException(status_code=422, detail="El título es obligatorio")

    media_url = await _save_uploaded_file(file, current_user.id)
    artwork_url = None
    if artwork and artwork.filename:
        if _media_type_for_ext(Path(artwork.filename).suffix.lower()) != "image":
            raise HTTPException(status_code=400, detail="La portada debe ser una imagen válida")
        artwork_url = await _save_uploaded_file(artwork, current_user.id)

    track = Track(
        owner_id=current_user.id,
        title=clean_title,
        media_url=media_url,
        artwork_url=artwork_url,
        visibility="public",
        radio_status="pending" if target == "radio" else "personal"
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    return _serialize_track(track)


@api_router.get("/radio/submissions", response_model=List[TrackResponse])
async def list_radio_submissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.username not in RADIO_CURATORS:
        raise HTTPException(status_code=403, detail="No autorizado")
    tracks = (
        db.query(Track)
        .filter(Track.radio_status == "pending")
        .order_by(Track.created_at.asc())
        .all()
    )
    return [_serialize_track(t) for t in tracks]


@api_router.post("/radio/submissions/{track_id}/approve", response_model=TrackResponse)
async def approve_radio_submission(
        track_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.username not in RADIO_CURATORS:
        raise HTTPException(status_code=403, detail="No autorizado")
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track no encontrado")

    track.radio_status = "approved"
    radio_playlist = db.query(Playlist).filter(Playlist.kind == "chaplin_radio").first()
    if not radio_playlist:
        radio_playlist = Playlist(owner_id=current_user.id, name="Chaplin Radio", kind="chaplin_radio", visibility="public")
        db.add(radio_playlist)
        db.commit()
        db.refresh(radio_playlist)

    existing_item = db.query(PlaylistItem).filter(
        PlaylistItem.playlist_id == radio_playlist.id, PlaylistItem.track_id == track_id
    ).first()
    if not existing_item:
        next_position = db.query(PlaylistItem).filter(PlaylistItem.playlist_id == radio_playlist.id).count()
        db.add(PlaylistItem(playlist_id=radio_playlist.id, track_id=track_id, position=next_position))

    db.commit()
    db.refresh(track)
    return _serialize_track(track)


@api_router.post("/radio/submissions/{track_id}/reject", response_model=TrackResponse)
async def reject_radio_submission(
        track_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.username not in RADIO_CURATORS:
        raise HTTPException(status_code=403, detail="No autorizado")
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track no encontrado")

    track.radio_status = "rejected"
    db.commit()
    db.refresh(track)
    return _serialize_track(track)


@api_router.put("/tracks/{track_id}", response_model=TrackResponse)
async def update_track(
        track_id: int,
        payload: TrackUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track no encontrado")
    if track.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    if payload.title is not None:
        track.title = payload.title
    if payload.artwork_url is not None:
        track.artwork_url = payload.artwork_url
    if payload.duration is not None:
        track.duration = payload.duration
    if payload.visibility is not None and payload.visibility in ("public", "private"):
        track.visibility = payload.visibility
    if payload.is_favorited is not None:
        track.is_favorited = payload.is_favorited

    db.commit()
    db.refresh(track)
    return _serialize_track(track)


@api_router.delete("/tracks/{track_id}")
async def delete_track(
        track_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Deletes only the Track's own metadata row (and its playlist memberships) —
    # NEVER the underlying Post or the media file on disk.
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track no encontrado")
    if track.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    db.query(PlaylistItem).filter(PlaylistItem.track_id == track_id).delete()
    db.delete(track)
    db.commit()
    return {"detail": "Track eliminado (el archivo de medios original no se ha tocado)"}


def _get_or_create_playlist(db: Session, owner: User, kind: str, default_name: str, visibility: str) -> "Playlist":
    playlist = db.query(Playlist).filter(Playlist.owner_id == owner.id, Playlist.kind == kind).first()
    if playlist:
        return playlist
    playlist = Playlist(owner_id=owner.id, name=default_name, kind=kind, visibility=visibility)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


@api_router.get("/playlists/mine", response_model=List[PlaylistResponse])
async def list_my_playlists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    playlists = db.query(Playlist).filter(Playlist.owner_id == current_user.id).all()
    return [_serialize_playlist(p) for p in playlists]


@api_router.get("/playlists/mine/personal", response_model=PlaylistResponse)
async def get_my_personal_playlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    playlist = _get_or_create_playlist(db, current_user, "personal", "Mi lista personal", "private")
    return _serialize_playlist(playlist)


@api_router.get("/playlists/mine/profile", response_model=PlaylistResponse)
async def get_my_profile_playlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    playlist = _get_or_create_playlist(db, current_user, "profile", "Playlist de perfil", "public")
    return _serialize_playlist(playlist)


@api_router.get("/playlists/profile/{username}", response_model=PlaylistResponse)
async def get_user_profile_playlist(username: str, db: Session = Depends(get_db)):
    owner = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    playlist = db.query(Playlist).filter(Playlist.owner_id == owner.id, Playlist.kind == "profile").first()
    if not playlist or playlist.visibility != "public":
        return PlaylistResponse(
            id=0, owner_id=owner.id, owner_username=owner.username,
            name="Playlist de perfil", kind="profile", visibility="public",
            created_at=datetime.utcnow(), tracks=[]
        )
    return _serialize_playlist(playlist, only_public_tracks=True)


@api_router.get("/users/{username}/profile-playback", response_model=ProfilePlaybackResponse)
async def get_profile_playback(username: str, db: Session = Depends(get_db)):
    """Resolves what the visited profile's player should actually play, based
    on the owner's profile_playback_mode — the frontend just renders whatever
    track list comes back, it never re-decides the mode itself."""
    owner = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    mode = owner.profile_playback_mode if owner.profile_playback_mode in ("all", "favorites", "radio") else "all"

    if mode == "radio":
        playlist = db.query(Playlist).filter(Playlist.kind == "chaplin_radio", Playlist.visibility == "public").first()
        tracks = []
        if playlist:
            ordered_items = sorted(playlist.items, key=lambda item: item.position)
            tracks = [
                _serialize_track(item.track)
                for item in ordered_items
                if item.track and item.track.visibility == "public"
            ]
    elif mode == "favorites":
        rows = (
            db.query(Track)
            .filter(Track.owner_id == owner.id, Track.visibility == "public", Track.is_favorited == True)
            .order_by(Track.created_at.desc())
            .all()
        )
        tracks = [_serialize_track(t) for t in rows]
    else:
        rows = (
            db.query(Track)
            .filter(Track.owner_id == owner.id, Track.visibility == "public")
            .order_by(Track.created_at.desc())
            .limit(200)
            .all()
        )
        tracks = [_serialize_track(t) for t in rows]

    return ProfilePlaybackResponse(mode=mode, owner_username=owner.username, tracks=tracks)


@api_router.get("/playlists/chaplin-radio", response_model=PlaylistResponse)
async def get_chaplin_radio_playlist(db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.kind == "chaplin_radio", Playlist.visibility == "public").first()
    if not playlist:
        return PlaylistResponse(
            id=0, owner_id=0, owner_username=None,
            name="Chaplin Radio", kind="chaplin_radio", visibility="public",
            created_at=datetime.utcnow(), tracks=[]
        )
    return _serialize_playlist(playlist, only_public_tracks=True)


@api_router.post("/playlists/", response_model=PlaylistResponse)
async def create_playlist(
        payload: PlaylistCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if payload.kind == "chaplin_radio" and current_user.username not in RADIO_CURATORS:
        raise HTTPException(status_code=403, detail="No autorizado para crear la Radio Chaplin")

    playlist = Playlist(
        owner_id=current_user.id,
        name=payload.name,
        kind=payload.kind,
        visibility=payload.visibility
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return _serialize_playlist(playlist)


def _authorize_playlist_owner(db: Session, playlist_id: int, current_user: User) -> "Playlist":
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist no encontrada")
    if playlist.owner_id != current_user.id:
        if playlist.kind != "chaplin_radio" or current_user.username not in RADIO_CURATORS:
            raise HTTPException(status_code=403, detail="No autorizado")
    return playlist


@api_router.put("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
        playlist_id: int,
        payload: PlaylistUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    playlist = _authorize_playlist_owner(db, playlist_id, current_user)
    if payload.name is not None:
        playlist.name = payload.name
    if payload.visibility is not None and payload.visibility in ("public", "private"):
        playlist.visibility = payload.visibility
    db.commit()
    db.refresh(playlist)
    return _serialize_playlist(playlist)


@api_router.post("/playlists/{playlist_id}/items", response_model=PlaylistResponse)
async def add_playlist_item(
        playlist_id: int,
        payload: PlaylistItemCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    playlist = _authorize_playlist_owner(db, playlist_id, current_user)
    track = db.query(Track).filter(Track.id == payload.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track no encontrado")

    existing = db.query(PlaylistItem).filter(
        PlaylistItem.playlist_id == playlist_id, PlaylistItem.track_id == payload.track_id
    ).first()
    if existing:
        return _serialize_playlist(playlist)

    next_position = db.query(PlaylistItem).filter(PlaylistItem.playlist_id == playlist_id).count()
    db.add(PlaylistItem(playlist_id=playlist_id, track_id=payload.track_id, position=next_position))
    db.commit()
    db.refresh(playlist)
    return _serialize_playlist(playlist)


@api_router.delete("/playlists/{playlist_id}/items/{track_id}", response_model=PlaylistResponse)
async def remove_playlist_item(
        playlist_id: int,
        track_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    playlist = _authorize_playlist_owner(db, playlist_id, current_user)
    db.query(PlaylistItem).filter(
        PlaylistItem.playlist_id == playlist_id, PlaylistItem.track_id == track_id
    ).delete()
    db.commit()
    db.refresh(playlist)
    return _serialize_playlist(playlist)


@api_router.put("/playlists/{playlist_id}/reorder", response_model=PlaylistResponse)
async def reorder_playlist(
        playlist_id: int,
        payload: PlaylistReorder,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    playlist = _authorize_playlist_owner(db, playlist_id, current_user)
    items_by_track = {item.track_id: item for item in playlist.items}
    for position, track_id in enumerate(payload.track_ids):
        item = items_by_track.get(track_id)
        if item:
            item.position = position
    db.commit()
    db.refresh(playlist)
    return _serialize_playlist(playlist)


# ========== MENSAJERÍA DIRECTA (DM) ==========
def _get_or_create_conversation(db: Session, user_id_a: int, user_id_b: int) -> Conversation:
    lo, hi = sorted((user_id_a, user_id_b))
    convo = db.query(Conversation).filter(Conversation.user_a_id == lo, Conversation.user_b_id == hi).first()
    if not convo:
        convo = Conversation(user_a_id=lo, user_b_id=hi)
        db.add(convo)
        db.commit()
        db.refresh(convo)
    return convo


def _serialize_conversation(convo: Conversation, current_user: User, db: Session) -> ConversationResponse:
    other = convo.user_b if convo.user_a_id == current_user.id else convo.user_a
    last = (
        db.query(Message)
        .filter(Message.conversation_id == convo.id)
        .order_by(Message.id.desc())
        .first()
    )
    unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == convo.id,
            Message.sender_id != current_user.id,
            Message.read_at.is_(None),
        )
        .count()
    )
    return ConversationResponse(
        id=convo.id,
        other_user_id=other.id,
        other_username=other.username,
        other_avatar_url=other.avatar_url,
        last_message=last.content if last else None,
        last_message_at=last.created_at if last else None,
        unread_count=unread,
    )


@api_router.get("/conversations/", response_model=List[ConversationResponse])
async def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convos = (
        db.query(Conversation)
        .filter((Conversation.user_a_id == current_user.id) | (Conversation.user_b_id == current_user.id))
        .all()
    )
    serialized = [_serialize_conversation(c, current_user, db) for c in convos]
    serialized.sort(key=lambda c: c.last_message_at or datetime.min, reverse=True)
    return serialized


@api_router.post("/conversations/", response_model=ConversationResponse)
async def start_conversation(
        payload: ConversationCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    other = db.query(User).filter(User.username == payload.username).first()
    if not other:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if other.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes iniciar una conversación contigo mismo")

    convo = _get_or_create_conversation(db, current_user.id, other.id)
    return _serialize_conversation(convo, current_user, db)


def _authorize_conversation_participant(db: Session, conversation_id: int, current_user: User) -> Conversation:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo or current_user.id not in (convo.user_a_id, convo.user_b_id):
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return convo


def _serialize_message(message: "Message", current_user: "User", db: Session) -> MessageResponse:
    rows = db.query(MessageReaction).filter(MessageReaction.message_id == message.id).all()
    grouped: dict = {}
    for row in rows:
        entry = grouped.setdefault(row.emoji, {"emoji": row.emoji, "count": 0, "reacted_by_me": False})
        entry["count"] += 1
        if row.user_id == current_user.id:
            entry["reacted_by_me"] = True
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
        message_type=message.message_type,
        created_at=message.created_at,
        read_at=message.read_at,
        reactions=[MessageReactionSummary(**entry) for entry in grouped.values()],
    )


@api_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def list_messages(
        conversation_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    convo = _authorize_conversation_participant(db, conversation_id, current_user)
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == convo.id)
        .order_by(Message.id.asc())
        .all()
    )
    # Mark messages from the other participant as read now that this user has
    # fetched them.
    unread_ids = [m.id for m in messages if m.sender_id != current_user.id and m.read_at is None]
    if unread_ids:
        db.query(Message).filter(Message.id.in_(unread_ids)).update(
            {"read_at": datetime.utcnow()}, synchronize_session=False
        )
        db.commit()
    return [_serialize_message(m, current_user, db) for m in messages]


@api_router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
        conversation_id: int,
        payload: MessageCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    convo = _authorize_conversation_participant(db, conversation_id, current_user)
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="El mensaje no puede estar vacío")
    if len(content) > 4000:
        raise HTTPException(status_code=413, detail="Mensaje demasiado largo")

    message = Message(conversation_id=convo.id, sender_id=current_user.id, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_message(message, current_user, db)


@api_router.post("/conversations/{conversation_id}/nudge", response_model=MessageResponse)
async def send_nudge(
        conversation_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """A Messenger-style "buzz" — the other side's chat shakes/vibrates when
    this arrives via their normal message poll. Rate-limited per sender so a
    held-down button can't spam the conversation."""
    convo = _authorize_conversation_participant(db, conversation_id, current_user)

    cooldown_cutoff = datetime.utcnow() - timedelta(seconds=3)
    recent = (
        db.query(Message)
        .filter(
            Message.conversation_id == convo.id,
            Message.sender_id == current_user.id,
            Message.message_type == "nudge",
            Message.created_at > cooldown_cutoff,
        )
        .first()
    )
    if recent:
        raise HTTPException(status_code=429, detail="Espera unos segundos antes de volver a enviar un toque")

    message = Message(conversation_id=convo.id, sender_id=current_user.id, content="👋", message_type="nudge")
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_message(message, current_user, db)


@api_router.post("/messages/{message_id}/react", response_model=MessageResponse)
async def react_to_message(
        message_id: int,
        payload: ReactionCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    _authorize_conversation_participant(db, message.conversation_id, current_user)

    emoji = payload.emoji.strip()
    if not emoji:
        raise HTTPException(status_code=422, detail="Emoji vacío")
    if len(emoji) > 8:
        raise HTTPException(status_code=422, detail="Emoji inválido")

    existing = (
        db.query(MessageReaction)
        .filter(MessageReaction.message_id == message_id, MessageReaction.user_id == current_user.id)
        .first()
    )
    if existing and existing.emoji == emoji:
        db.delete(existing)
    else:
        if existing:
            db.delete(existing)
            db.flush()
        db.add(MessageReaction(message_id=message_id, user_id=current_user.id, emoji=emoji))
    db.commit()
    db.refresh(message)
    return _serialize_message(message, current_user, db)


# ========== ENDPOINTS DE USUARIOS ==========
@api_router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _serialize_user(current_user, db)


@api_router.get("/users/by-username/{username}", response_model=PublicUserResponse)
async def get_user_by_username(
        username: str,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Registered before /users/{user_id} on purpose: FastAPI/Starlette match routes
    # in declaration order, and {user_id} has no `:int` path-converter, so it would
    # otherwise swallow this request first and fail Pydantic int coercion on "by-username".
    user = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _serialize_public_user(user, current_user, db)


@api_router.get("/users/search", response_model=List[PublicUserResponse])
async def search_users(
        q: str = Query(..., min_length=1, max_length=50),
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Registered before /users/{user_id} on purpose: {user_id} has no `:int`
    # path-converter, so it would otherwise swallow "/users/search" first and
    # fail Pydantic int coercion on "search" (same reasoning as by-username).
    like = f"%{q.strip()}%"
    query = db.query(User).filter(
        User.profile_public == True,
        or_(User.username.ilike(like), User.first_name.ilike(like), User.last_name.ilike(like))
    )
    if current_user:
        query = query.filter(User.id != current_user.id)
    results = query.order_by(User.username).limit(20).all()
    return [_serialize_public_user(u, current_user, db) for u in results]


@api_router.get("/users/{user_id}", response_model=PublicUserResponse)
async def get_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    user = db.query(User).filter(User.id == user_id, User.profile_public == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _serialize_public_user(user, current_user, db)


@api_router.post("/users/{username}/follow", response_model=PublicUserResponse)
async def toggle_follow(
        username: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    target = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes seguirte a ti mismo")

    existing = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.followed_id == target.id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(Follow(follower_id=current_user.id, followed_id=target.id))
    db.commit()
    return _serialize_public_user(target, current_user, db)


@api_router.get("/users/{username}/followers", response_model=List[FollowUserResponse])
async def list_followers(
        username: str,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    target = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    followers = (
        db.query(User)
        .join(Follow, Follow.follower_id == User.id)
        .filter(Follow.followed_id == target.id)
        .all()
    )
    return [
        FollowUserResponse(
            id=u.id, username=u.username, first_name=u.first_name, last_name=u.last_name,
            avatar_url=u.avatar_url, is_online=_is_online(u)
        )
        for u in followers
    ]


@api_router.get("/users/{username}/following", response_model=List[FollowUserResponse])
async def list_following(
        username: str,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    target = db.query(User).filter(User.username == username, User.profile_public == True).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    following = (
        db.query(User)
        .join(Follow, Follow.followed_id == User.id)
        .filter(Follow.follower_id == target.id)
        .all()
    )
    return [
        FollowUserResponse(
            id=u.id, username=u.username, first_name=u.first_name, last_name=u.last_name,
            avatar_url=u.avatar_url, is_online=_is_online(u)
        )
        for u in following
    ]


class PublicThemeEnvironment(BaseModel):
    baseTheme: Optional[str] = None
    variant: Optional[str] = None
    accent: Optional[str] = None
    surfaceOpacity: Optional[float] = None
    # Visual identity system (Copilot's theme/HUD/material/layout/typography work):
    # these are just preset-selector IDs, small numeric knobs, hex colors, and
    # font-family names — never arbitrary content — so they're safe to expose
    # the same way baseTheme/accent already are. Extended for CHAPLIN MOBILE
    # ALPHA (Prioridad 9) once Copilot's system grew past the original set.
    materialId: Optional[str] = None
    hudId: Optional[str] = None
    layoutId: Optional[str] = None
    typographyId: Optional[str] = None
    shapeId: Optional[str] = None
    density: Optional[str] = None
    ornament: Optional[float] = None
    materialIntensity: Optional[float] = None
    secondaryAccent: Optional[str] = None
    animatedBackground: Optional[bool] = None
    surfaceBackground: Optional[str] = None
    surfaceBorder: Optional[str] = None
    surfaceText: Optional[str] = None
    fontDisplay: Optional[str] = None
    fontBody: Optional[str] = None
    fontUI: Optional[str] = None
    fontMono: Optional[str] = None


class PublicBackgroundEnvironment(BaseModel):
    style: Optional[str] = None
    finish: Optional[str] = None
    visualizerPreset: Optional[str] = None
    reactivity: Optional[float] = None
    deformIntensity: Optional[float] = None
    motionIntensity: Optional[float] = None
    bassBoost: Optional[float] = None
    trebleBoost: Optional[float] = None
    color: Optional[str] = None


class PublicProfileEnvironment(BaseModel):
    theme: PublicThemeEnvironment
    background: PublicBackgroundEnvironment


@api_router.get("/users/{user_id}/environment", response_model=PublicProfileEnvironment)
async def get_user_public_environment(user_id: int, db: Session = Depends(get_db)):
    # PRIVACY BOUNDARY: this is the only place `User.preferences` is ever read for a
    # public response, and it is projected through an explicit whitelist below.
    # Never return `user.preferences` (or any subset of its raw dict) directly —
    # anything added to that internal blob in the future (volume, drafts, admin
    # flags, device settings...) stays private unless deliberately added here.
    user = db.query(User).filter(User.id == user_id, User.profile_public == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    raw = {}
    if user.preferences:
        try:
            parsed = json.loads(user.preferences)
            if isinstance(parsed, dict):
                raw = parsed
        except (TypeError, ValueError):
            raw = {}

    def _num(key):
        value = raw.get(key)
        return value if isinstance(value, (int, float)) else None

    def _str(key):
        value = raw.get(key)
        return value if isinstance(value, str) else None

    def _bool(key):
        value = raw.get(key)
        return value if isinstance(value, bool) else None

    return PublicProfileEnvironment(
        theme=PublicThemeEnvironment(
            baseTheme=_str("base_theme"),
            variant=_str("theme_variant"),
            accent=_str("accent_color"),
            surfaceOpacity=_num("layout_opacity"),
            materialId=_str("material_id"),
            hudId=_str("hud_grammar_id"),
            layoutId=_str("layout_composition_id"),
            typographyId=_str("typography_profile_id"),
            shapeId=_str("shape_language_id"),
            density=_str("visual_density"),
            ornament=_num("ornament_level"),
            materialIntensity=_num("material_intensity"),
            secondaryAccent=_str("secondary_accent"),
            animatedBackground=_bool("animated_background"),
            surfaceBackground=_str("layout_background"),
            surfaceBorder=_str("layout_border"),
            surfaceText=_str("layout_text"),
            fontDisplay=_str("font_primary"),
            fontBody=_str("font_secondary"),
            fontUI=_str("font_ui"),
            fontMono=_str("font_mono"),
        ),
        background=PublicBackgroundEnvironment(
            style=_str("vortex_background_style"),
            finish=_str("vortex_finish_type"),
            visualizerPreset=_str("vortex_visualizer_preset"),
            reactivity=_num("vortex_reactivity"),
            deformIntensity=_num("vortex_deform_intensity"),
            motionIntensity=_num("vortex_motion_intensity"),
            bassBoost=_num("vortex_bass_boost"),
            trebleBoost=_num("vortex_treble_boost"),
            color=_str("vortex_color"),
        ),
    )


@api_router.put("/users/me", response_model=UserResponse)
async def update_user(
        bio: Optional[str] = Form(None),
        profile_public: Optional[bool] = Form(None),
        radio_public: Optional[bool] = Form(None),
        preferences: Optional[str] = Form(None),
        role: Optional[str] = Form(None),
        role_other: Optional[str] = Form(None),
        presence_status: Optional[str] = Form(None),
        profile_playback_mode: Optional[str] = Form(None),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if bio is not None:
        current_user.bio = bio
    if profile_public is not None:
        current_user.profile_public = profile_public
    if radio_public is not None:
        current_user.radio_public = radio_public
    if presence_status is not None:
        if presence_status not in VALID_PRESENCE_STATUSES:
            raise HTTPException(status_code=422, detail=f"presence_status debe ser uno de {VALID_PRESENCE_STATUSES}")
        current_user.presence_status = presence_status
    if role is not None:
        if role not in ROLE_OPTIONS:
            raise HTTPException(status_code=422, detail=f"role debe ser uno de {sorted(ROLE_OPTIONS)}")
        current_user.role = role
        current_user.role_other = role_other if role == "otro" else None
    elif role_other is not None:
        current_user.role_other = role_other
    if profile_playback_mode is not None:
        if profile_playback_mode not in ("all", "favorites", "radio"):
            raise HTTPException(status_code=422, detail="profile_playback_mode debe ser 'all', 'favorites' o 'radio'")
        current_user.profile_playback_mode = profile_playback_mode
    if preferences is not None:
        # Validate it's actually JSON before persisting, but store the raw string
        # so the client owns the shape of its own preferences blob. Copilot's
        # visual-identity system keeps adding new keys (theme/material/HUD/layout/
        # typography/...) — don't gate on a fixed key whitelist here, just bound
        # the overall size so this can't be abused as free-form blob storage.
        if len(preferences.encode("utf-8")) > MAX_PREFERENCES_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"preferences excede el tamaño máximo permitido ({MAX_PREFERENCES_BYTES} bytes)"
            )
        try:
            json.loads(preferences)
            current_user.preferences = preferences
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="preferences debe ser JSON válido")

    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user, db)


AVATAR_CONTENT_TYPE_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


@api_router.post("/users/me/avatar", response_model=UserResponse)
async def upload_avatar(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if Path(file.filename or "").suffix.lower() not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        # Mobile gallery/file pickers (Android in particular) often hand the
        # browser a File with no usable extension - or the wrong one - even
        # though the image itself is fine. The multipart Content-Type is
        # what the browser/WebView determined from the real file, so fall
        # back to that before rejecting a genuinely valid photo.
        fallback_ext = AVATAR_CONTENT_TYPE_TO_EXT.get((file.content_type or "").lower())
        if not fallback_ext:
            raise HTTPException(status_code=400, detail="La foto de perfil debe ser una imagen (jpg/png/gif/webp)")
        file.filename = f"avatar{fallback_ext}"

    avatar_url = await _save_uploaded_file(file, current_user.id)
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user, db)


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
# NOTE: GET "/" used to return a JSON "welcome" placeholder here. Removed —
# CHAPLIN MOBILE ALPHA now serves the real built frontend at "/" (see the
# frontend-serving block near the end of this file), which is what the PWA
# manifest's start_url points at. For a plain API ping, use /api/v1/ or /docs.
@api_router.get("/")
async def root_api():
    return {"api": "v1", "status": "active"}


@api_router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Verificar conexión a DB
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    payload = {
        "status": "running",
        "database": db_status,
        "timestamp": datetime.now().isoformat(),
        "version": app.version,
        "env": CHAPLIN_ENV,
        "process_started_at": _PROCESS_STARTED_AT
    }
    # main_py_last_modified answers "am I running the code I just saved?" —
    # useful during local development, but it's a filesystem timestamp with no
    # purpose for anyone hitting a real beta/prod deployment, so keep it dev-only.
    if CHAPLIN_ENV == "development":
        payload["main_py_last_modified"] = _MAIN_PY_MTIME
    return payload


@api_router.get("/tags")
async def get_tags():
    return {"tags": DEFAULT_TAGS}


# ========== CONFIGURACIÓN FINAL ==========
# Incluir router principal
app.include_router(api_router, prefix="/api/v1")


def _ensure_column(connection, table: str, column: str, ddl_type: str):
    """Additive, idempotent migration helper: adds a column if it doesn't already
    exist. `Base.metadata.create_all()` only creates missing TABLES, it never
    alters existing ones — so new columns on a table that already exists in the
    live SQLite file (like `users`) need this instead. Never drops or rewrites
    existing data."""
    existing = {row[1] for row in connection.execute(text(f"PRAGMA table_info({table})")).fetchall()}
    if column not in existing:
        connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
        print(f"[OK] Migracion: columna '{column}' anadida a '{table}'")


def _ensure_index(connection, index_name: str, table: str, column: str):
    """Idempotent migration helper for an existing table — CREATE INDEX IF NOT
    EXISTS is natively idempotent in SQLite, so no PRAGMA check needed. Added
    for Track.media_url/Post.media_url so /media/{filename} (hit on every
    Range sub-request during audio playback) doesn't full-table-scan as the
    library grows past a handful of rows."""
    connection.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table}({column})"))


def backfill_tracks_from_audio_posts(db: Session) -> dict:
    """Additive, idempotent migration: creates a Track for every audio Post that
    doesn't already have one (matched via Track.source_post_id). Never touches,
    moves, renames, or deletes the underlying Post or its media file. Safe to run
    on every startup — running it twice never creates duplicate Tracks."""
    audio_posts = db.query(Post).filter(Post.media_type == "audio", Post.media_url.isnot(None)).all()
    existing_source_ids = {
        row[0] for row in db.query(Track.source_post_id).filter(Track.source_post_id.isnot(None)).all()
    }

    created = 0
    for post in audio_posts:
        if post.id in existing_source_ids:
            continue
        title = (post.content or "").strip()
        title = title[:120] if title else f"Untitled Track #{post.id}"
        db.add(Track(
            owner_id=post.owner_id,
            title=title,
            media_url=post.media_url,
            visibility="public" if post.is_public else "private",
            source_post_id=post.id
        ))
        created += 1

    if created:
        db.commit()

    return {"audio_posts_detected": len(audio_posts), "tracks_created": created}


# Crear tablas de la base de datos al iniciar
@app.on_event("startup")
def startup():
    # Canonical paths, logged once at every boot — this is the single source of
    # truth for "which DB/media copy is actually live", precisely to avoid ever
    # again wondering whether a root-level or backend/-level copy is in use.
    print(f"[PATH] Chaplin DB canonica:    {DEFAULT_SQLITE_PATH if not _chaplin_db_path else Path(_chaplin_db_path).resolve()}")
    print(f"[PATH] Chaplin media canonica: {MEDIA_FOLDER.resolve()}")
    print(f"[PATH] Project root:           {PROJECT_ROOT}")

    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        _ensure_column(connection, "users", "preferences", "TEXT")
        _ensure_column(connection, "users", "avatar_url", "VARCHAR")
        _ensure_column(connection, "users", "role", "VARCHAR NOT NULL DEFAULT 'user'")
        _ensure_column(connection, "users", "role_other", "VARCHAR")
        _ensure_column(connection, "users", "last_seen", "DATETIME")
        _ensure_column(connection, "posts", "track_id", "INTEGER")
        _ensure_column(connection, "users", "presence_status", "VARCHAR NOT NULL DEFAULT 'online'")
        _ensure_column(connection, "messages", "message_type", "VARCHAR NOT NULL DEFAULT 'text'")
        _ensure_column(connection, "tracks", "radio_status", "VARCHAR NOT NULL DEFAULT 'personal'")
        _ensure_column(connection, "tracks", "is_favorited", "BOOLEAN NOT NULL DEFAULT 0")
        _ensure_column(connection, "users", "profile_playback_mode", "VARCHAR NOT NULL DEFAULT 'all'")
        _ensure_index(connection, "ix_posts_media_url", "posts", "media_url")
        _ensure_index(connection, "ix_tracks_media_url", "tracks", "media_url")
        # post_likes/comment_likes/messages are brand-new tables — create_all()
        # above already creates their indexes from Column(index=True), no
        # additive migration needed (that's only for columns on tables that
        # already existed with data, like posts/tracks above).
    MEDIA_FOLDER.mkdir(parents=True, exist_ok=True)
    print("[OK] Base de datos inicializada")
    print("[OK] Carpeta media creada")

    migration_db = SessionLocal()
    try:
        stats = backfill_tracks_from_audio_posts(migration_db)
        print(
            f"[OK] Migracion Track: {stats['audio_posts_detected']} audio posts detectados, "
            f"{stats['tracks_created']} tracks nuevos creados"
        )
    finally:
        migration_db.close()


# ========== SERVIR MEDIA CON CONTROL DE VISIBILIDAD ==========
# CRITICAL: a plain StaticFiles mount serves every file in MEDIA_FOLDER to
# anyone regardless of the Track/Post visibility rules enforced elsewhere —
# a Track's metadata can 404 for a stranger while its raw audio file is still
# a public URL. A private resource whose bytes are fetchable by a public URL
# is not private, no matter how unguessable the filename is. This single
# route is the one choke point every media file passes through, so the
# Track/Post visibility rule only needs to be enforced in one place.
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


@app.get("/media/{filename}")
async def serve_media(
        filename: str,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user)
):
    # `filename` can't legitimately contain a path separator — Path(...).name
    # strips any "../" component, so a mismatch means someone tried to escape
    # MEDIA_FOLDER.
    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    file_path = MEDIA_FOLDER / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    media_url = f"/media/{safe_name}"

    def _is_owner(owner_id: int) -> bool:
        return current_user is not None and current_user.id == owner_id

    track = db.query(Track).filter(Track.media_url == media_url).first()
    if track and track.visibility != "public" and not _is_owner(track.owner_id):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    post = db.query(Post).filter(Post.media_url == media_url).first()
    if post and not post.is_public and not _is_owner(post.owner_id):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # FileResponse streams from disk (never loads the whole file into memory)
    # and handles Range/If-Range/ETag itself, so seeking in a large audio file
    # keeps working exactly like the old StaticFiles mount did.
    return FileResponse(file_path)


# ========== SERVIR EL FRONTEND (PWA) — CHAPLIN MOBILE ALPHA ==========
# Single-origin architecture: this same FastAPI process serves the built
# frontend (frontend/web/dist, produced by `npm run build`) alongside the
# API and media routes, so a phone only ever needs one URL — no CORS, no
# "which port is the API on" guessing. Only active when a build actually
# exists; local `npm run dev` (Vite + its own proxy) is unaffected and stays
# the normal day-to-day workflow (Prioridad 29 — no destruir el dev workflow).
_FRONTEND_DIST = PROJECT_ROOT / "frontend" / "web" / "dist"

if _FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND_DIST / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Registered last, so /api/*, /media/*, /docs etc. above always match
        # first when well-formed — this only ever receives whatever nothing
        # else claimed. A malformed/probing request that was clearly AIMED at
        # /api/ or /media/ (e.g. a path-traversal attempt that fails to match
        # /media/{filename}'s single-segment pattern) must still 404 like a
        # real backend route would, not silently serve the SPA shell with 200 —
        # no client-side route legitimately starts with these prefixes anyway.
        if full_path.startswith("api/") or full_path.startswith("media/"):
            raise HTTPException(status_code=404, detail="No encontrado")

        candidate = _FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        # SPA fallback: client-side routes like /profile/someuser must still
        # resolve to the app shell on a hard reload, not a 404.
        return FileResponse(_FRONTEND_DIST / "index.html")


# ========== EJECUCIÓN ==========
if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("CHAPLIN SOCIAL NETWORK - Y2K Edition")
    print("=" * 50)
    print("Servidor: http://localhost:8000")
    print("Documentacion: http://localhost:8000/docs")
    print("Radio: http://localhost:8000/api/v1/radio/stations")
    print("Codigos de invitacion:", ", ".join(INVITATION_CODES))
    print("=" * 50)

    # Ejecutar el módulo real de la app para modo local con reload
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)