# backend/app/api/v1/__init__.py
# Versión simplificada - importa solo lo que existe
try:
    from .auth import router as auth_router
except ImportError:
    auth_router = None

try:
    from .users import router as users_router
except ImportError:
    users_router = None

try:
    from .posts import router as posts_router
except ImportError:
    posts_router = None

try:
    from .comments import router as comments_router
except ImportError:
    comments_router = None

try:
    from .radio import router as radio_router
except ImportError:
    radio_router = None

__all__ = [
    "auth_router",
    "users_router",
    "posts_router",
    "comments_router",
    "radio_router",
]