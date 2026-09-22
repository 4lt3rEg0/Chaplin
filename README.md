#  Chaplin Social Network

Una red social vanilla estilo Y2K futurista sin algoritmos de recomendación.

##  Características

-  **Radio comunitaria** - Estaciones globales y personales
-  **Feed espiral** - Interfaz única con scroll en espiral
-  **Sistema de tags** - Clasificación con #tags#
-  **Traducción automática** - Contenido traducido en tiempo real
-  **Estética Y2K** - Diseño futurista con efectos CRT
-  **Sin algoritmos** - Feed cronológico simple
-  **Multiplataforma** - Web y Android (React Native)

##  Instalación Rápida

### 1. Requisitos
```bash
Python 3.11+
Node.js 18+
Docker y Docker Compose
Redis
PostgreSQL (opcional, SQLite por defecto)
```

### 2. Mapa de puertos recomendado
- Backend API: 8000
- Radio server: 8001
- Vite dev: 5173 (o el siguiente libre)

### 3. Arranque estable en Windows (recomendado)
Desde la raiz del repo:

```powershell
scripts\dev-up.ps1
```

Opciones utiles:

```powershell
# Si hay conflicto de puertos, los libera automaticamente
scripts\dev-up.ps1 -KillConflicts

# Si quieres levantar tambien el radio_server
scripts\dev-up.ps1 -StartRadio

# Equivalente en cmd
scripts\dev-up.cmd -KillConflicts -StartRadio
```

### 4. Limpieza de ruido del venv
Si se generan muchos .pyc dentro de backend/venv:

```powershell
scripts\clean-venv-noise.ps1
```

## Notas de sincronizacion
- El frontend en desarrollo usa proxy /api hacia el backend (8000).
- El trafico del radio server queda separado en 8001.
- Si usas VITE_API_BASE_URL manual, apunta a http://localhost:8000/api/v1.
