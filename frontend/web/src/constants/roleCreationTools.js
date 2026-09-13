// Único punto donde se decide qué herramienta de creación abre el botón
// "Publicar" según el rol del usuario (ver constants/roles.js para el
// catálogo completo de roles). Un rol sin entrada aquí no es un error —
// cae al asistente genérico a propósito, hasta que se le construya su
// propia herramienta. Añadir un rol nuevo en el futuro es una entrada más
// aquí, nunca lógica nueva en los puntos de llamada (GlobalMobileDock, etc.).
export const ROLE_CREATION_TOOLS = Object.freeze({
  musico: { route: '/create/track', label: 'Subir canción' },
  escritor: { route: '/books/new', label: 'Nuevo libro' },
});

const GENERIC_ROUTE = '/editor';

export function getCreationDestination(role) {
  return ROLE_CREATION_TOOLS[role]?.route || GENERIC_ROUTE;
}
