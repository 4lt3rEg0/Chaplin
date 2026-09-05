// Single-origin architecture: in prod the backend serves the built frontend,
// so relative /media/ URLs already resolve correctly. In dev (Vite on its own
// port) they must be redirected to the backend's actual origin.
export const resolveMediaBase = () => {
  const env = import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.VITE_API_TARGET || "";
  if (env) {
    return env.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

export const normalizeTrackSrc = (src) => {
  if (!src || typeof src !== "string") return src;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("blob:") || src.startsWith("data:")) {
    return src;
  }

  if (src.startsWith("/media/")) {
    if (import.meta.env.DEV) {
      return src;
    }

    return `${resolveMediaBase()}${src}`;
  }

  return src;
};

export const areSameSrc = (currentAudioSrc, nextSrc) => {
  if (!currentAudioSrc || !nextSrc) return false;
  try {
    const currentUrl = new URL(currentAudioSrc, window.location.origin);
    const nextUrl = new URL(nextSrc, window.location.origin);
    return currentUrl.href === nextUrl.href;
  } catch {
    return currentAudioSrc === nextSrc;
  }
};
