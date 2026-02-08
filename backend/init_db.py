from app.database import engine, Base
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment

print("Creando base de datos...")
Base.metadata.create_all(bind=engine)
print("✅ Base de datos creada!")