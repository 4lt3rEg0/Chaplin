# backend/app/api/v1/api.py
from fastapi import APIRouter

api_router = APIRouter()

# Importar routers condicionalmente
try:
    from .endpoints.auth import router as auth_router
    api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
except ImportError:
    pass

try:
    from .endpoints.users import router as users_router
    api_router.include_router(users_router, prefix="/users", tags=["users"])
except ImportError:
    pass

try:
    from .endpoints.posts import router as posts_router
    api_router.include_router(posts_router, prefix="/posts", tags=["posts"])
except ImportError:
    pass

try:
    from .endpoints.comments import router as comments_router
    api_router.include_router(comments_router, prefix="/comments", tags=["comments"])
except ImportError:
    pass

try:
    from .endpoints.radio import router as radio_router
    api_router.include_router(radio_router, prefix="/radio", tags=["radio"])
except ImportError:
    pass