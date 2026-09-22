# Chaplin

Chaplin es una plataforma social, multimedia e interactiva desarrollada como proyecto full-stack. Su objetivo es combinar publicación social, perfiles altamente personalizables, música, radio, mensajería, creación de contenido y espacios comunitarios sin depender de un sistema de recomendaciones algorítmicas.

El feed principal mantiene un orden cronológico y la identidad visual del proyecto mezcla interfaces Y2K, Frutiger Aero, reproductores inspirados en software multimedia clásico y elementos 3D.

## Estado del proyecto

Chaplin se encuentra en desarrollo activo. Actualmente dispone de frontend web funcional, backend REST, persistencia de datos, autenticación, gestión de contenido multimedia, integración Android mediante Capacitor y una PWA para instalación desde navegadores compatibles.

No se considera todavía una versión de producción final.

## Funcionalidades principales

### Red social

- Registro e inicio de sesión con autenticación JWT.
- Feed cronológico sin motor de recomendación.
- Publicaciones de texto y contenido multimedia.
- Comentarios y likes en publicaciones y comentarios.
- Sistema de tags y búsqueda de contenido.
- Perfiles públicos y privados.
- Seguidores y seguidos.
- Búsqueda de usuarios.
- Estado de presencia: online, ausente e invisible.
- Traducción de contenido.
- Configuración de preferencias de usuario.

### Perfiles y personalización

- Perfiles visualmente personalizables.
- Reproductor musical integrado en el perfil.
- Diferentes skins y conceptos de reproductor.
- Fondos y elementos visuales configurables.
- Componentes 3D mediante Three.js y React Three Fiber.
- Herramientas internas para diseñar, reconstruir y validar skins de reproductores.

### Música

- Subida y gestión de pistas.
- Biblioteca musical personal.
- Favoritos.
- Reproducción desde el perfil.
- Playlists personales.
- Playlist pública asociada al perfil.
- Chaplin Radio con sistema de envío, aprobación y rechazo de pistas.
- Radio comunitaria con servidor independiente y comunicación en tiempo real mediante WebSockets.

### Mensajería

- Conversaciones privadas.
- Mensajes entre usuarios.
- Reacciones a mensajes.
- Nudges.
- Bandeja de entrada integrada en la aplicación.

### Libros y escritura

- Creación de libros.
- Portada, título, sinopsis y género.
- Editor de capítulos.
- Publicación independiente de libro y capítulos.
- Visualización de obras publicadas desde los perfiles.

### Comunidad

- Foro con categorías.
- Creación de hilos.
- Respuestas.
- Likes en hilos.
- Sistema de eventos y batallas.
- Gestión de instrumentales y elementos asociados a las batallas.

## Arquitectura

```text
Chaplin/
├── backend/             API, autenticación, modelos y persistencia
├── frontend/
│   └── web/             Aplicación React/Vite y proyecto Android Capacitor
├── radio_server/        Servicio independiente para radio en tiempo real
├── scripts/             Scripts de desarrollo y mantenimiento
├── tools/               Herramientas internas de assets y reconstrucción visual
├── docs/                Documentación y especificaciones de diseño
├── assets-source/       Material fuente para recursos visuales
└── docker-compose.yml   Entorno opcional con PostgreSQL y Redis
```

## Stack tecnológico

### Frontend

- React 18
- Vite
- React Router
- Three.js
- React Three Fiber
- React Three Drei
- Framer Motion
- styled-components
- Axios
- Vite PWA
- Playwright

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT
- SQLite por defecto
- PostgreSQL como alternativa
- Gestión de archivos multimedia
- WebSockets en el servicio de radio

### Mobile

- Capacitor
- Android WebView
- Proyecto Android integrado dentro de `frontend/web/android`

## Requisitos de desarrollo

Como mínimo:

```text
Python 3.11+
Node.js 18+
npm
```

Para determinadas configuraciones también pueden utilizarse:

```text
Docker y Docker Compose
Redis
PostgreSQL
```

SQLite se utiliza por defecto durante el desarrollo local.

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/4lt3rEg0/Chaplin.git
cd Chaplin
```

### 2. Backend

Crea y activa un entorno virtual e instala las dependencias:

```bash
cd backend
python -m venv .venv
```

En Windows:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Arranca la API:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend

Desde `frontend/web`:

```bash
npm install
npm run dev
```

Por defecto, Vite utiliza el puerto `5173`.

## Arranque de desarrollo en Windows

El repositorio incluye scripts para levantar el entorno local desde la raíz:

```powershell
scripts\dev-up.ps1
```

Para liberar conflictos de puertos automáticamente:

```powershell
scripts\dev-up.ps1 -KillConflicts
```

Para iniciar también el servidor de radio:

```powershell
scripts\dev-up.ps1 -StartRadio
```

También existe un wrapper para CMD:

```cmd
scripts\dev-up.cmd -KillConflicts -StartRadio
```

## Puertos de desarrollo

| Servicio | Puerto |
| --- | ---: |
| Backend FastAPI | 8000 |
| Radio server | 8001 |
| Vite | 5173 |

El frontend utiliza un proxy de desarrollo para `/api` y `/media` hacia el backend y `/radio-api` hacia el servicio de radio.

Si se configura manualmente:

```text
VITE_API_TARGET=http://localhost:8000
VITE_RADIO_TARGET=http://localhost:8001
```

Para túneles o hosts de desarrollo remotos, utiliza `VITE_ALLOWED_HOSTS` en el entorno local. No se versionan dominios de túneles concretos en el repositorio.

## PWA

La aplicación web incluye soporte PWA mediante `vite-plugin-pwa`.

La estrategia actual evita cachear las respuestas de `/api` y el contenido servido desde `/media`, de forma que la autorización del backend siga ejecutándose en cada petición.

## Android

Chaplin utiliza Capacitor para empaquetar la aplicación web dentro de un proyecto Android.

El proyecto nativo se encuentra en:

```text
frontend/web/android
```

La aplicación mantiene el frontend React como base y utiliza Android WebView para su ejecución móvil.

## Testing

El frontend incluye pruebas end-to-end con Playwright:

```bash
cd frontend/web
npm run test:e2e
```

El backend contiene pruebas para distintas áreas del sistema, incluyendo autenticación, búsqueda de usuarios, grafo social, presencia y carga de música.

## Configuración y seguridad

Los secretos reales no deben almacenarse en el repositorio.

Para entornos distintos de desarrollo debe definirse una clave persistente:

```text
CHAPLIN_SECRET_KEY
```

También puede configurarse:

```text
CHAPLIN_ENV
DATABASE_URL
CHAPLIN_DB_PATH
CHAPLIN_MEDIA_ROOT
ACCESS_TOKEN_EXPIRE_MINUTES
```

En desarrollo, si no existe una clave explícita, Chaplin puede generar una clave local persistente en un archivo ignorado por Git. En entornos beta o producción se requiere una clave configurada expresamente.

## Base de datos

El desarrollo local utiliza SQLite por defecto.

Para despliegues o entornos alternativos puede utilizarse PostgreSQL mediante `DATABASE_URL`.

El repositorio incluye además una configuración Docker Compose con servicios para:

- Backend
- Frontend
- PostgreSQL
- Redis
- Radio server

Antes de usar Docker Compose, copia `.env.example` a `.env` y sustituye los valores de ejemplo. `POSTGRES_PASSWORD` y `CHAPLIN_SECRET_KEY` deben definirse explícitamente; los valores reales no se versionan.

## Filosofía del proyecto

Chaplin intenta priorizar control del usuario, identidad visual y contenido creado por personas frente a un feed gobernado por recomendaciones automáticas.

La plataforma está diseñada como un laboratorio de producto y desarrollo donde conviven red social, multimedia, música, escritura, comunicación y experimentación visual dentro de una misma aplicación.

## Autor

Desarrollado por Oliver Alexander Álvarez Gómez.

GitHub: https://github.com/4lt3rEg0
