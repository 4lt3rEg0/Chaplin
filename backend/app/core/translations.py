from googletrans import Translator
from typing import Dict

translator = Translator()


async def translate_text(text: str, target_lang: str = "en") -> Dict[str, str]:
    """Translate text to multiple languages"""
    try:
        translations = {}

        # Translate to main languages
        for lang in ['en', 'es', 'fr', 'de', 'zh-cn', 'ja', 'ru']:
            if lang != target_lang:
                translated = translator.translate(text, dest=lang, src=target_lang)
                translations[lang] = translated.text

        return translations
    except Exception:
        # Return empty dict if translation fails
        return {}