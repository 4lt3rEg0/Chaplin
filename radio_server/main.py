import asyncio
import websockets
import json
import redis
from typing import Set, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Chaplin Radio Server")

# Redis para almacenar estado
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Almacen de conexiones
connections: Dict[str, Set[WebSocket]] = {
    "global": set(),
}

# Almacen de usuarios por radio
radio_users: Dict[str, Set[str]] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_radios: Dict[str, str] = {}  # user_id -> radio_id

    async def connect(self, websocket: WebSocket, radio_id: str, user_id: str):
        await websocket.accept()

        if radio_id not in self.active_connections:
            self.active_connections[radio_id] = set()

        self.active_connections[radio_id].add(websocket)
        self.user_radios[user_id] = radio_id

        # Actualizar contador
        await self.broadcast_user_count(radio_id)

        return websocket

    async def disconnect(self, websocket: WebSocket, user_id: str):
        radio_id = self.user_radios.get(user_id)
        if radio_id and radio_id in self.active_connections:
            self.active_connections[radio_id].discard(websocket)
            del self.user_radios[user_id]

            # Actualizar contador
            await self.broadcast_user_count(radio_id)

    async def broadcast_user_count(self, radio_id: str):
        count = len(self.active_connections.get(radio_id, set()))
        message = json.dumps({
            "type": "listeners_update",
            "radio_id": radio_id,
            "count": count
        })

        if radio_id in self.active_connections:
            await self.broadcast_to_radio(radio_id, message)

    async def broadcast_to_radio(self, radio_id: str, message: str):
        if radio_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[radio_id]:
                try:
                    await connection.send_text(message)
                except:
                    disconnected.add(connection)

            # Limpiar conexiones desconectadas
            self.active_connections[radio_id] -= disconnected

    async def broadcast_audio(self, radio_id: str, audio_data: bytes, user_id: str):
        """Transmitir audio a todos los oyentes de una radio"""
        message = json.dumps({
            "type": "audio_data",
            "user_id": user_id,
            "radio_id": radio_id,
            "data": audio_data.hex()  # Convertir bytes a hex para JSON
        })

        await self.broadcast_to_radio(radio_id, message)


manager = ConnectionManager()


# WebSocket endpoint
@app.websocket("/ws/{radio_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, radio_id: str, user_id: str):
    await manager.connect(websocket, radio_id, user_id)

    try:
        while True:
            data = await websocket.receive()

            if 'text' in data:
                message = json.loads(data['text'])

                if message.get('type') == 'audio_stream':
                    # Retransmitir audio a otros usuarios
                    await manager.broadcast_audio(
                        radio_id,
                        bytes.fromhex(message['data']),
                        user_id
                    )

                elif message.get('type') == 'chat_message':
                    # Retransmitir mensaje de chat
                    chat_msg = json.dumps({
                        "type": "chat_message",
                        "user_id": user_id,
                        "message": message['message'],
                        "timestamp": message['timestamp']
                    })
                    await manager.broadcast_to_radio(radio_id, chat_msg)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)


# API REST para información de radios
@app.get("/api/radios")
async def get_radios():
    """Obtener lista de radios públicas"""
    radios = []

    for radio_id, connections in manager.active_connections.items():
        if radio_id == "global" or await is_radio_public(radio_id):
            radios.append({
                "id": radio_id,
                "name": await get_radio_name(radio_id),
                "listeners": len(connections),
                "is_public": True,
                "owner": await get_radio_owner(radio_id)
            })

    return radios


@app.post("/api/radios/{radio_id}/start")
async def start_radio(radio_id: str, user_id: str):
    """Iniciar una radio personal"""
    if radio_id not in manager.active_connections:
        manager.active_connections[radio_id] = set()

    # Marcar como pública/privada según preferencias del usuario
    await set_radio_public(radio_id, True)  # Por defecto pública

    return {"status": "started", "radio_id": radio_id}


# Funciones auxiliares (implementar según tu DB)
async def is_radio_public(radio_id: str) -> bool:
    """Verificar si una radio es pública"""
    return redis_client.get(f"radio:{radio_id}:public") == "true"


async def set_radio_public(radio_id: str, is_public: bool):
    """Establecer visibilidad de una radio"""
    redis_client.set(f"radio:{radio_id}:public", str(is_public).lower())


async def get_radio_name(radio_id: str) -> str:
    """Obtener nombre de la radio"""
    name = redis_client.get(f"radio:{radio_id}:name")
    return name or f"Radio {radio_id}"


async def get_radio_owner(radio_id: str) -> str:
    """Obtener dueño de la radio"""
    owner = redis_client.get(f"radio:{radio_id}:owner")
    return owner or "unknown"


# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)