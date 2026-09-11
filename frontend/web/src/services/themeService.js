import api from "./api";

const THEME_CACHE_KEY = "chaplin_theme_profile";

const hasToken = () => Boolean(localStorage.getItem("token"));

const safeRead = () => {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeWrite = (value) => {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const safeParseObject = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

// Fields that live inside the `preferences` JSON blob on the backend, as opposed
// to bio/profile_public/radio_public which are real dedicated User columns.
const PREFERENCE_KEYS = [
  "profile_layout",
  "base_theme",
  "theme_variant",
  "accent_color",
  "secondary_accent",
  "animated_background",
  "layout_background",
  "layout_border",
  "layout_text",
  "font_primary",
  "font_secondary",
  "font_ui",
  "font_mono",
  "layout_opacity",
  "material_id",
  "hud_grammar_id",
  "layout_composition_id",
  "typography_profile_id",
  "shape_language_id",
  "visual_density",
  "ornament_level",
  "material_intensity",
  "vortex_background_style",
  "vortex_finish_type",
  "vortex_color",
  "vortex_visualizer_preset",
  "vortex_reactivity",
  "vortex_deform_intensity",
  "vortex_motion_intensity",
  "vortex_bass_boost",
  "vortex_treble_boost",
  "player_skin_id",
  "player_color_mode",
  "player_custom_palettes"
];

const splitPreferences = (payload) => {
  const preferences = {};
  const rest = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (PREFERENCE_KEYS.includes(key)) {
      preferences[key] = value;
    } else {
      rest[key] = value;
    }
  });
  return { preferences, rest };
};

export const getTheme = async () => {
  if (!hasToken()) {
    return safeRead();
  }

  try {
    const { data } = await api.get("/users/me");
    if (data) {
      const remotePreferences = data.preferences ? safeParseObject(data.preferences) : null;
      const merged = {
        ...(safeRead() || {}),
        ...(remotePreferences || {}),
        bio: data.bio || "",
        profile_public: data.profile_public !== false,
        radio_public: Boolean(data.radio_public)
      };
      safeWrite(merged);
      return merged;
    }
  } catch {
    // fallback to local cache
  }

  return safeRead();
};

export const updateTheme = async (payload) => {
  const current = safeRead() || {};
  const next = { ...current, ...payload };
  safeWrite(next);

  if (!hasToken()) {
    return next;
  }

  try {
    const { preferences: incomingPreferences, rest } = splitPreferences(payload);
    const form = new FormData();
    if (typeof rest.bio !== "undefined") form.append("bio", rest.bio ?? "");
    if (typeof rest.profile_public !== "undefined") {
      form.append("profile_public", String(Boolean(rest.profile_public)));
    }
    if (typeof rest.radio_public !== "undefined") {
      form.append("radio_public", String(Boolean(rest.radio_public)));
    }
    if (typeof rest.role !== "undefined") {
      form.append("role", rest.role);
    }
    if (typeof rest.role_other !== "undefined") {
      form.append("role_other", rest.role_other ?? "");
    }

    if (Object.keys(incomingPreferences).length > 0) {
      const { preferences: currentPreferences } = splitPreferences(current);
      const mergedPreferences = { ...currentPreferences, ...incomingPreferences };
      PREFERENCE_KEYS.forEach((key) => {
        if (typeof next[key] !== "undefined") {
          mergedPreferences[key] = next[key];
        }
      });
      form.append("preferences", JSON.stringify(mergedPreferences));
    }

    if ([...form.keys()].length > 0) {
      const { data } = await api.put("/users/me", form);
      if (data) {
        const remotePreferences = data.preferences ? safeParseObject(data.preferences) : null;
        const merged = {
          ...next,
          ...(remotePreferences || {}),
          bio: data.bio || "",
          profile_public: data.profile_public !== false,
          radio_public: Boolean(data.radio_public)
        };
        safeWrite(merged);
        return merged;
      }
    }
  } catch {
    // keep local state when backend is unavailable
  }

  return next;
};
