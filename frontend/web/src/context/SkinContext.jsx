import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getTheme, updateTheme } from '../services/themeService';
import { buildAppTheme, resolveThemeId, THEME_PRESETS, THEME_VARIANTS } from '../styles/Y2KTheme';
import { CHAPLIN_LAYOUT_SYSTEMS, CHAPLIN_LAYOUT_SYSTEM_LIST } from '../styles/ChaplinLayoutSystems';
import {
  HUD_GRAMMARS,
  LAYOUT_COMPOSITIONS,
  MATERIAL_PROFILES,
  TYPOGRAPHY_PROFILES
} from '../styles/visualIdentitySystem';

const SkinContext = createContext(null);

export const SkinProvider = ({ children }) => {
  const [skinId, setSkinId] = useState(
    resolveThemeId(localStorage.getItem('chaplin_skin') || 'y2k')
  );
  const [accentColor, setAccentColor] = useState(
    localStorage.getItem('chaplin_accent') || THEME_PRESETS.y2k.accent
  );
  const [secondaryAccent, setSecondaryAccent] = useState(localStorage.getItem('chaplin_secondary_accent') || '');
  const [themeVariant, setThemeVariant] = useState(
    localStorage.getItem('chaplin_theme_variant') || 'default'
  );
  const [materialId, setMaterialId] = useState(localStorage.getItem('chaplin_material_id') || '');
  const [hudId, setHudId] = useState(localStorage.getItem('chaplin_hud_id') || '');
  const [layoutId, setLayoutId] = useState(localStorage.getItem('chaplin_layout_id') || '');
  const [typographyId, setTypographyId] = useState(localStorage.getItem('chaplin_typography_id') || '');
  const [shapeId, setShapeId] = useState(localStorage.getItem('chaplin_shape_id') || '');
  const [density, setDensity] = useState(localStorage.getItem('chaplin_density') || '');
  const [ornament, setOrnament] = useState(Number(localStorage.getItem('chaplin_ornament') || '2'));
  const [materialIntensity, setMaterialIntensity] = useState(Number(localStorage.getItem('chaplin_material_intensity') || '0.72'));
  const [layoutBackground, setLayoutBackground] = useState(
    localStorage.getItem('chaplin_layout_bg') || ''
  );
  const [layoutBorder, setLayoutBorder] = useState(
    localStorage.getItem('chaplin_layout_border') || ''
  );
  const [layoutText, setLayoutText] = useState(
    localStorage.getItem('chaplin_layout_text') || ''
  );
  const [fontPrimary, setFontPrimary] = useState(
    localStorage.getItem('chaplin_font_primary') || ''
  );
  const [fontSecondary, setFontSecondary] = useState(
    localStorage.getItem('chaplin_font_secondary') || ''
  );
  const [fontUi, setFontUi] = useState(
    localStorage.getItem('chaplin_font_ui') || ''
  );
  const [fontMono, setFontMono] = useState(localStorage.getItem('chaplin_font_mono') || '');
  const [layoutOpacity, setLayoutOpacity] = useState(
    Number(localStorage.getItem('chaplin_layout_opacity') || '0.92')
  );
  const [playerSkinId, setPlayerSkinId] = useState(
    localStorage.getItem('chaplin_player_skin_id') || 'plugin'
  );

  const [animations, setAnimations] = useState(
    localStorage.getItem('chaplin_fx') !== 'off'
  );

  const [loadedFromBackend, setLoadedFromBackend] = useState(false);

  // Temporary override applied while viewing another user's public profile
  // (Profile Owner Environment). Shape: { baseTheme, variant, accent, surfaceOpacity }.
  // This NEVER writes into the visitor's own state/localStorage/backend — it only
  // changes what `skinData`/`appTheme` resolve to for as long as it's set.
  const [profileOverride, setProfileOverride] = useState(null);

  // ===== Theme preview (Settings → Temas) =====
  // While isPreviewingTheme is true, the save-to-backend/localStorage effect
  // below is skipped entirely, so setters can be called freely for a live
  // preview without persisting anything. `beginThemePreview` snapshots every
  // themeable field; `cancelThemePreview` restores that exact snapshot;
  // `commitThemePreview` just stops skipping the save effect, which then
  // persists whatever is currently live (the previewed values).
  const [isPreviewingTheme, setIsPreviewingTheme] = useState(false);
  const themeSnapshotRef = useRef(null);

  /* ===================== LOAD FROM BACKEND ===================== */

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const data = await getTheme();
        if (!data) {
          return;
        }
        const resolvedTheme = resolveThemeId(data?.base_theme);

        if (data?.base_theme) {
          setSkinId(resolvedTheme);
          setAccentColor(data.accent_color || THEME_PRESETS[resolvedTheme].accent);
          if (typeof data.secondary_accent === 'string') setSecondaryAccent(data.secondary_accent);
          setThemeVariant(data.theme_variant || 'default');
          if (typeof data.material_id === 'string') setMaterialId(data.material_id);
          if (typeof data.hud_grammar_id === 'string') setHudId(data.hud_grammar_id);
          if (typeof data.layout_composition_id === 'string') setLayoutId(data.layout_composition_id);
          if (typeof data.typography_profile_id === 'string') setTypographyId(data.typography_profile_id);
          if (typeof data.shape_language_id === 'string') setShapeId(data.shape_language_id);
          if (typeof data.visual_density === 'string') setDensity(data.visual_density);
          if (Number.isFinite(Number(data.ornament_level))) setOrnament(Number(data.ornament_level));
          if (Number.isFinite(Number(data.material_intensity))) setMaterialIntensity(Number(data.material_intensity));
          setAnimations(Boolean(data.animated_background));
          if (data.layout_background) setLayoutBackground(data.layout_background);
          if (data.layout_border) setLayoutBorder(data.layout_border);
          if (data.layout_text) setLayoutText(data.layout_text);
          const legacyFont = typeof data.font_family === 'string' ? data.font_family : '';
          if (typeof data.font_primary === 'string') setFontPrimary(data.font_primary);
          else if (legacyFont) setFontPrimary(legacyFont);
          if (typeof data.font_secondary === 'string') setFontSecondary(data.font_secondary);
          else if (legacyFont) setFontSecondary(legacyFont);
          if (typeof data.font_ui === 'string') setFontUi(data.font_ui);
          else if (legacyFont) setFontUi(legacyFont);
          if (typeof data.font_mono === 'string') setFontMono(data.font_mono);
          if (typeof data.layout_opacity !== 'undefined') {
            const nextOpacity = Number(data.layout_opacity);
            if (Number.isFinite(nextOpacity)) {
              setLayoutOpacity(Math.max(0.1, Math.min(1, nextOpacity)));
            }
          }
          if (typeof data.player_skin_id === 'string' && data.player_skin_id) {
            setPlayerSkinId(data.player_skin_id);
          }
        }
      } catch (err) {
        console.log("No theme loaded (user not logged?)");
      } finally {
        setLoadedFromBackend(true);
      }
    };

    loadTheme();
  }, []);

  /* ===================== SAVE TO BACKEND ===================== */

  useEffect(() => {
    if (!loadedFromBackend || isPreviewingTheme) return;

    const saveTheme = async () => {
      try {
        await updateTheme({
          base_theme: skinId,
          theme_variant: themeVariant,
          accent_color: accentColor,
          secondary_accent: secondaryAccent,
          animated_background: animations,
          layout_background: layoutBackground,
          layout_border: layoutBorder,
          layout_text: layoutText,
          font_primary: fontPrimary,
          font_secondary: fontSecondary,
          font_ui: fontUi,
          font_mono: fontMono,
          layout_opacity: layoutOpacity,
          material_id: materialId,
          hud_grammar_id: hudId,
          layout_composition_id: layoutId,
          typography_profile_id: typographyId,
          shape_language_id: shapeId,
          visual_density: density,
          ornament_level: ornament,
          material_intensity: materialIntensity,
          player_skin_id: playerSkinId
        });
      } catch (err) {
        console.log("Theme not saved (not logged?)");
      }
    };

    saveTheme();

    localStorage.setItem('chaplin_skin', skinId);
    localStorage.setItem('chaplin_accent', accentColor);
    localStorage.setItem('chaplin_secondary_accent', secondaryAccent);
    localStorage.setItem('chaplin_theme_variant', themeVariant);
    localStorage.setItem('chaplin_fx', animations ? 'on' : 'off');
    localStorage.setItem('chaplin_layout_bg', layoutBackground);
    localStorage.setItem('chaplin_layout_border', layoutBorder);
    localStorage.setItem('chaplin_layout_text', layoutText);
    localStorage.setItem('chaplin_font_primary', fontPrimary);
    localStorage.setItem('chaplin_font_secondary', fontSecondary);
    localStorage.setItem('chaplin_font_ui', fontUi);
    localStorage.setItem('chaplin_font_mono', fontMono);
    localStorage.setItem('chaplin_layout_opacity', String(layoutOpacity));
    localStorage.setItem('chaplin_material_id', materialId);
    localStorage.setItem('chaplin_hud_id', hudId);
    localStorage.setItem('chaplin_layout_id', layoutId);
    localStorage.setItem('chaplin_typography_id', typographyId);
    localStorage.setItem('chaplin_shape_id', shapeId);
    localStorage.setItem('chaplin_density', density);
    localStorage.setItem('chaplin_ornament', String(ornament));
    localStorage.setItem('chaplin_material_intensity', String(materialIntensity));
    localStorage.setItem('chaplin_player_skin_id', playerSkinId);

  }, [
    skinId,
    accentColor,
    secondaryAccent,
    themeVariant,
    animations,
    layoutBackground,
    layoutBorder,
    layoutText,
    fontPrimary,
    fontSecondary,
    fontUi,
    fontMono,
    layoutOpacity,
    materialId,
    hudId,
    layoutId,
    typographyId,
    shapeId,
    density,
    ornament,
    materialIntensity,
    playerSkinId,
    loadedFromBackend,
    isPreviewingTheme
  ]);

  /* ===================== THEME PREVIEW CONTROLS ===================== */

  const themeFieldSetters = {
    skinId: setSkinId,
    accentColor: setAccentColor,
    secondaryAccent: setSecondaryAccent,
    themeVariant: setThemeVariant,
    materialId: setMaterialId,
    hudId: setHudId,
    layoutId: setLayoutId,
    typographyId: setTypographyId,
    shapeId: setShapeId,
    density: setDensity,
    ornament: setOrnament,
    materialIntensity: setMaterialIntensity,
    layoutBackground: setLayoutBackground,
    layoutBorder: setLayoutBorder,
    layoutText: setLayoutText,
    fontPrimary: setFontPrimary,
    fontSecondary: setFontSecondary,
    fontUi: setFontUi,
    fontMono: setFontMono,
    layoutOpacity: setLayoutOpacity,
    animations: setAnimations,
    playerSkinId: setPlayerSkinId
  };
  const themeFieldValues = {
    skinId, accentColor, secondaryAccent, themeVariant, materialId, hudId,
    layoutId, typographyId, shapeId, density, ornament, materialIntensity,
    layoutBackground, layoutBorder, layoutText, fontPrimary, fontSecondary,
    fontUi, fontMono, layoutOpacity, animations, playerSkinId
  };

  const beginThemePreview = () => {
    themeSnapshotRef.current = { ...themeFieldValues };
    setIsPreviewingTheme(true);
  };

  const cancelThemePreview = () => {
    const snapshot = themeSnapshotRef.current;
    if (snapshot) {
      Object.entries(snapshot).forEach(([key, value]) => {
        themeFieldSetters[key]?.(value);
      });
    }
    themeSnapshotRef.current = null;
    setIsPreviewingTheme(false);
  };

  const commitThemePreview = () => {
    themeSnapshotRef.current = null;
    setIsPreviewingTheme(false);
  };

  const baseResolvedSkinId = resolveThemeId(skinId);
  const resolvedSkinId = profileOverride?.baseTheme
    ? resolveThemeId(profileOverride.baseTheme)
    : baseResolvedSkinId;
  const effectiveAccentColor = profileOverride?.accent || accentColor;
  const effectiveThemeVariant = profileOverride?.variant || themeVariant;
  const effectiveLayoutOpacity = Number.isFinite(profileOverride?.surfaceOpacity)
    ? profileOverride.surfaceOpacity
    : layoutOpacity;
  const effectiveMaterialId = profileOverride?.materialId || materialId;
  const effectiveHudId = profileOverride?.hudId || hudId;
  const effectiveLayoutId = profileOverride?.layoutId || layoutId;
  const effectiveTypographyId = profileOverride?.typographyId || typographyId;
  const effectiveShapeId = profileOverride?.shapeId || shapeId;
  const effectiveDensity = profileOverride?.density || density;
  const effectiveOrnament = Number.isFinite(profileOverride?.ornament) ? profileOverride.ornament : ornament;
  const effectiveMaterialIntensity = Number.isFinite(profileOverride?.materialIntensity)
    ? profileOverride.materialIntensity
    : materialIntensity;

  const skinData = useMemo(() => ({
    ...THEME_PRESETS[resolvedSkinId],
    accent: effectiveAccentColor,
    animated: animations
  }), [resolvedSkinId, effectiveAccentColor, animations]);

  const appTheme = useMemo(() => buildAppTheme(resolvedSkinId, effectiveAccentColor, animations, effectiveThemeVariant, {
    layoutBackground,
    layoutBorder,
    layoutText,
    fontPrimary,
    fontSecondary,
    fontUi,
    fontMono,
    secondaryAccent,
    layoutOpacity: effectiveLayoutOpacity,
    materialId: effectiveMaterialId,
    hudId: effectiveHudId,
    layoutId: effectiveLayoutId,
    typographyId: effectiveTypographyId,
    shapeId: effectiveShapeId,
    density: effectiveDensity,
    ornament: effectiveOrnament,
    materialIntensity: effectiveMaterialIntensity
  }), [
    resolvedSkinId,
    effectiveAccentColor,
    animations,
    effectiveThemeVariant,
    layoutBackground,
    layoutBorder,
    layoutText,
    fontPrimary,
    fontSecondary,
    fontUi,
    fontMono,
    secondaryAccent,
    effectiveMaterialId,
    effectiveHudId,
    effectiveLayoutId,
    effectiveTypographyId,
    effectiveShapeId,
    effectiveDensity,
    effectiveOrnament,
    effectiveMaterialIntensity,
    effectiveLayoutOpacity
  ]);

  const value = useMemo(() => ({
    skinId: resolvedSkinId,
    skinData,
    setSkinId,
    profileOverride,
    setProfileOverride,
    accentColor,
    setAccentColor,
    secondaryAccent,
    setSecondaryAccent,
    layoutBackground,
    setLayoutBackground,
    layoutBorder,
    setLayoutBorder,
    layoutText,
    setLayoutText,
    fontPrimary,
    setFontPrimary,
    fontSecondary,
    setFontSecondary,
    fontUi,
    setFontUi,
    fontMono,
    setFontMono,
    layoutOpacity,
    setLayoutOpacity,
    themeVariant,
    setThemeVariant,
    themeVariants: THEME_VARIANTS,
    materialId,
    setMaterialId,
    materials: MATERIAL_PROFILES,
    hudId,
    setHudId,
    hudGrammars: HUD_GRAMMARS,
    layoutId,
    setLayoutId,
    layoutCompositions: LAYOUT_COMPOSITIONS,
    typographyId,
    setTypographyId,
    typographyProfiles: TYPOGRAPHY_PROFILES,
    shapeId,
    setShapeId,
    density,
    setDensity,
    ornament,
    setOrnament,
    materialIntensity,
    setMaterialIntensity,
    layoutSystems: CHAPLIN_LAYOUT_SYSTEMS,
    layoutSystemList: CHAPLIN_LAYOUT_SYSTEM_LIST,
    animations,
    setAnimations,
    skins: THEME_PRESETS,
    appTheme,
    playerSkinId,
    setPlayerSkinId,
    isPreviewingTheme,
    beginThemePreview,
    cancelThemePreview,
    commitThemePreview
  }), [
    resolvedSkinId,
    skinData,
    profileOverride,
    accentColor,
    secondaryAccent,
    layoutBackground,
    layoutBorder,
    layoutText,
    fontPrimary,
    fontSecondary,
    fontUi,
    fontMono,
    layoutOpacity,
    themeVariant,
    materialId,
    hudId,
    layoutId,
    typographyId,
    shapeId,
    density,
    ornament,
    materialIntensity,
    animations,
    appTheme,
    playerSkinId,
    isPreviewingTheme
  ]);

  return (
    <SkinContext.Provider value={value}>
      {children}
    </SkinContext.Provider>
  );
};

export const useSkin = () => useContext(SkinContext);
