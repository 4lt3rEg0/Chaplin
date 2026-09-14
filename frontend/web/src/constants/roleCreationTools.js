// Único punto donde se decide qué herramienta de creación abre el botón
// "Publicar" según el rol del usuario (ver constants/roles.js para el
// catálogo completo de roles). Un rol sin entrada aquí no es un error —
// cae al asistente genérico a propósito, hasta que se le construya su
// propia herramienta. Añadir un rol nuevo en el futuro es una entrada más
// aquí, nunca lógica nueva en los puntos de llamada (GlobalMobileDock, etc.).
export const ROLE_CREATION_TOOLS = Object.freeze({
  musico: { route: '/create/track', label: 'Subir canción' },
  escritor: { route: '/books/new', label: 'Nuevo libro' },
  fotografia_cine: { route: '/create/visual', label: 'Foto / Vídeo' },
});

// Para el resto de roles, que todavía no tienen herramienta propia: en vez
// de aterrizar en el asistente genérico vacío (siempre en "foto" por
// defecto), preseleccionamos el tipo de contenido que más encaja con el
// oficio — Editor.jsx ya lee `?type=` (mismo mecanismo que usa el panel de
// Publicar del feed), así que esto no es más que pasarle el parámetro
// correcto. Puro valor de arranque, no cambia qué puede publicar nadie.
const ROLE_DEFAULT_CONTENT_TYPE = Object.freeze({
  dibujante_tatuador: 'photo',
  moda: 'photo',
  comedia: 'video',
  periodismo: 'diary',
  ciencia: 'diary',
  it: 'diary',
  gaming: 'video',
  sanidad: 'diary',
  farmaceutica: 'diary',
  psicologia: 'diary',
  veterinaria: 'photo',
  derecho: 'diary',
  politica: 'diary',
  seguridad: 'diary',
  magisterio: 'diary',
  negocios: 'diary',
  finanzas: 'diary',
  arquitectura_construccion: 'photo',
  automocion: 'photo',
  agricultura: 'photo',
  belleza_estetica: 'photo',
  deporte: 'video',
  gastronomia: 'photo',
  espiritualidad: 'diary',
  modelos: 'photo',
  modelos_adultos: 'photo',
  // casual/otro: sin entrada a propósito, se quedan con el default de
  // Editor.jsx (foto) — no hay un oficio concreto que sugiera otra cosa.
});

const GENERIC_ROUTE = '/editor';

// Returns { path, params } rather than a plain path string — callers (e.g.
// GlobalMobileDock's makePathWithFlags) build their own query string from
// `params` and preserve their own flags (mobile/allpages) at the same time,
// so this never has to know about or embed a raw "?..." itself.
export function getCreationDestination(role) {
  const dedicated = ROLE_CREATION_TOOLS[role]?.route;
  if (dedicated) return { path: dedicated, params: {} };

  const defaultType = ROLE_DEFAULT_CONTENT_TYPE[role];
  return { path: GENERIC_ROUTE, params: defaultType ? { type: defaultType } : {} };
}
