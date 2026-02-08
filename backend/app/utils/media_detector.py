\"\"\"
Utilidad para detectar tipo de archivo multimedia
\"\"\"
from pathlib import Path
from enum import Enum


class MediaType(str, Enum):
    TEXT = 'text'
    IMAGE = 'image'
    VIDEO = 'video'
    AUDIO = 'audio'
    UNKNOWN = 'unknown'


def detect_media_type(filename: str) -> MediaType:
    \"\"\"
    Detecta el tipo de media basado en la extensi?n del archivo
    \"\"\"
    if not filename:
        return MediaType.TEXT

    ext = Path(filename).suffix.lower()

    # Extensiones de imagen
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'}

    # Extensiones de video
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'}

    # Extensiones de audio
    audio_extensions = {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'}

    if ext in image_extensions:
        return MediaType.IMAGE
    elif ext in video_extensions:
        return MediaType.VIDEO
    elif ext in audio_extensions:
        return MediaType.AUDIO
    else:
        return MediaType.UNKNOWN


def is_allowed_file(filename: str) -> bool:
    \"\"\"
    Verifica si el archivo tiene una extensi?n permitida
    \"\"\"
    media_type = detect_media_type(filename)
    return media_type in [MediaType.IMAGE, MediaType.VIDEO, MediaType.AUDIO]


def get_media_icon(media_type: MediaType) -> str:
    \"\"\"
    Devuelve el icono correspondiente al tipo de media
    \"\"\"
    icons = {
        MediaType.TEXT: '??',
        MediaType.IMAGE: '???',
        MediaType.VIDEO: '??',
        MediaType.AUDIO: '??',
        MediaType.UNKNOWN: '??'
    }
    return icons.get(media_type, '??')
