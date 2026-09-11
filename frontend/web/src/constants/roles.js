// Única fuente de verdad para el catálogo de roles/identidades profesionales
// que puede elegir un usuario, al registrarse o después desde Ajustes.
// Los ids deben coincidir exactamente con ROLE_OPTIONS en backend/app/main.py.
export const OTHER_ROLE_ID = 'otro';

export const ROLE_OPTIONS = [
  { id: 'casual', label: 'Casual', group: 'General' },

  { id: 'musico', label: 'Músico', group: 'Creativos' },
  { id: 'escritor', label: 'Escritor', group: 'Creativos' },
  { id: 'dibujante_tatuador', label: 'Dibujante / Tatuador', group: 'Creativos' },
  { id: 'fotografia_cine', label: 'Fotografía / Cine', group: 'Creativos' },
  { id: 'moda', label: 'Moda', group: 'Creativos' },
  { id: 'comedia', label: 'Comedia / Entretenimiento', group: 'Creativos' },

  { id: 'periodismo', label: 'Periodismo', group: 'Medios' },
  { id: 'ciencia', label: 'Ciencia / Investigación', group: 'Medios' },

  { id: 'it', label: 'IT / Desarrollo', group: 'Tecnología' },
  { id: 'gaming', label: 'Gaming / Esports / Streaming', group: 'Tecnología' },

  { id: 'sanidad', label: 'Sanidad', group: 'Salud' },
  { id: 'farmaceutica', label: 'Farmacéutica', group: 'Salud' },
  { id: 'psicologia', label: 'Psicología / Terapia', group: 'Salud' },
  { id: 'veterinaria', label: 'Veterinaria', group: 'Salud' },

  { id: 'derecho', label: 'Derecho / Abogacía', group: 'Legal y administración' },
  { id: 'politica', label: 'Política / Administración pública', group: 'Legal y administración' },
  { id: 'seguridad', label: 'Seguridad / Fuerzas de seguridad', group: 'Legal y administración' },

  { id: 'magisterio', label: 'Magisterio / Docencia', group: 'Educación' },

  { id: 'negocios', label: 'Negocios / Emprendimiento', group: 'Negocios' },
  { id: 'finanzas', label: 'Finanzas / Economía', group: 'Negocios' },

  { id: 'arquitectura_construccion', label: 'Arquitectura / Construcción', group: 'Oficios' },
  { id: 'automocion', label: 'Automoción / Mecánica', group: 'Oficios' },
  { id: 'agricultura', label: 'Agricultura / Ganadería', group: 'Oficios' },

  { id: 'belleza_estetica', label: 'Belleza / Estética', group: 'Servicios y bienestar' },
  { id: 'deporte', label: 'Deporte / Entrenamiento', group: 'Servicios y bienestar' },
  { id: 'gastronomia', label: 'Gastronomía / Hostelería', group: 'Servicios y bienestar' },
  { id: 'espiritualidad', label: 'Espiritualidad / Religión', group: 'Servicios y bienestar' },

  { id: 'modelos', label: 'Modelos', group: 'Modelos' },
  { id: 'modelos_adultos', label: 'Modelos (contenido adulto)', group: 'Modelos' },

  { id: OTHER_ROLE_ID, label: 'Otro — escríbenos aquí', group: 'General' }
];
