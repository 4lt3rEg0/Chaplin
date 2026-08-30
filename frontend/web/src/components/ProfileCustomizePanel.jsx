import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSkin } from '../context/SkinContext';
import { getTheme, updateTheme } from '../services/themeService';
import api, { uploadProfileMusic } from '../services/api';
import ProfileHeader from './ProfileHeader';
import {
  resolveCardTexture,
  resolveMaterialOverlay,
  resolveShapeClipPath,
  resolveShapeRadius,
  resolveWidgetRadius
} from '../styles/hudTokens';

const Panel = styled.section.attrs((props) => ({ 'data-shape': props.theme.card?.shape || 'rounded' }))`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow: ${({ theme }) => theme.card?.shadow || '0 12px 32px rgba(0,0,0,0.35)'};
  border-radius: ${({ theme }) => resolveShapeRadius(theme.card?.shape || 'rounded', theme.card?.radius || '20px')};
  clip-path: ${({ theme }) => resolveShapeClipPath(theme.card?.shape || 'rounded')};
  padding: var(--card-inset-y) var(--card-inset-x);
  min-width: 0;
  min-height: var(--card-min-height);
  position: relative;
  overflow: visible;
  flex-shrink: 0;
  container-type: inline-size;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) => resolveMaterialOverlay(theme.card?.material || 'glass')};
    opacity: calc(0.1 + var(--material-intensity, .72) * .86);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) => resolveCardTexture(theme.card?.material || 'glass')};
    opacity: calc(0.04 + var(--material-intensity, .72) * .42);
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  margin-bottom: 10px;

  @media (max-width: 760px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.5px;
  line-height: 1.2;
  overflow-wrap: anywhere;
  padding-block: 2px;

  @container (max-width: 320px) {
    font-size: 17px;
    letter-spacing: 0;
  }
`;

const Sub = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  line-height: 1.45;
`;

const Section = styled.div`
  margin-top: 12px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.7px;
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.38);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 10px;
  text-align: center;
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.38);
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => resolveWidgetRadius(theme.card?.widgetShape || 'rounded')};
  padding: 10px;
  text-align: center;
`;

const CheckLine = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  > * { min-width: 0; }

  @container (max-width: 420px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidth = styled.div`
  grid-column: 1 / -1;
`;

const Btn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => resolveWidgetRadius(theme.card?.widgetShape || 'rounded')};
  padding: 9px 12px;
  cursor: pointer;
  min-height: 40px;
  line-height: 1.3;
  white-space: normal;
  overflow-wrap: anywhere;
`;

const Status = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const MusicPlayer = styled.audio`
  width: 100%;
  margin-top: 8px;
`;

const MiniPreview = styled.div`
  margin-top: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
  min-width: 0;
`;

const CardSample = styled.div`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: ${({ theme }) => resolveShapeRadius(theme.card?.shape || 'rounded', '12px')};
  clip-path: ${({ theme }) => resolveShapeClipPath(theme.card?.shape || 'rounded')};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow: ${({ theme }) => theme.card?.shadow || 'none'};
  padding: max(12px, var(--card-inset-y)) max(14px, var(--card-inset-x));
  min-width: 0;

  strong, p { overflow-wrap: anywhere; }
`;

const ChoiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr));
  gap: 8px;
`;

const ChoiceCard = styled.button`
  min-height: 92px;
  border: 1px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  border-radius: 8px;
  padding: 12px;
  color: ${({ theme }) => theme.colors.text};
  background:
    ${({ $texture }) => $texture || 'none'},
    ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow: ${({ theme, $active }) => $active ? `inset 0 0 0 1px ${theme.colors.primary}` : 'none'};
  cursor: pointer;
  text-align: left;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;

  strong, span { display: block; }
  strong { font-size: 11px; line-height: 1.3; overflow-wrap: anywhere; }
  span { margin-top: 5px; font-size: 10px; opacity: .76; line-height: 1.35; overflow-wrap: anywhere; }
`;

const Advanced = styled.details`
  grid-column: 1 / -1;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: 12px;

  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.primary};
    font: 700 12px ${({ theme }) => theme.fonts.ui};
    text-transform: uppercase;
  }
`;

const Wireframe = styled.span`
  height: 34px;
  margin-bottom: 7px;
  border: 1px solid currentColor;
  opacity: .7;
  background:
    ${({ $kind }) => $kind === 'edge'
      ? 'linear-gradient(90deg, currentColor 0 7%, transparent 7% 93%, currentColor 93%)'
      : $kind === 'studio'
        ? 'repeating-linear-gradient(90deg, transparent 0 14%, currentColor 14% 15%)'
        : $kind === 'collector'
          ? 'linear-gradient(currentColor 0 35%, transparent 35%), linear-gradient(90deg, transparent 0 48%, currentColor 48% 51%, transparent 51%)'
          : $kind === 'gallery'
            ? 'linear-gradient(90deg, transparent 0 18%, currentColor 18% 82%, transparent 82%)'
            : 'linear-gradient(90deg, currentColor 0 22%, transparent 22% 76%, currentColor 76%)'};
`;

export default function ProfileCustomizePanel({ embedded = false }) {
  const fontFamilyOptions = [
    { value: "'Orbitron', 'Trebuchet MS', sans-serif", label: 'Orbitron' },
    { value: "'Inter', 'Segoe UI', sans-serif", label: 'Inter' },
    { value: "'SF Pro Display', 'Segoe UI', sans-serif", label: 'SF Pro Display' },
    { value: "'Poppins', 'Segoe UI', sans-serif", label: 'Poppins' },
    { value: "'Montserrat', 'Segoe UI', sans-serif", label: 'Montserrat' },
    { value: "'Roboto', 'Segoe UI', sans-serif", label: 'Roboto' },
    { value: "'JetBrains Mono', 'Consolas', monospace", label: 'JetBrains Mono' },
    { value: "'Segoe UI', 'Arial', sans-serif", label: 'Segoe UI' }
  ];

  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const {
    skinId,
    setSkinId,
    themeVariant,
    setThemeVariant,
    themeVariants,
    materialId,
    setMaterialId,
    materials,
    hudId,
    setHudId,
    hudGrammars,
    layoutId,
    setLayoutId,
    layoutCompositions,
    typographyId,
    setTypographyId,
    typographyProfiles,
    shapeId,
    setShapeId,
    density,
    setDensity,
    ornament,
    setOrnament,
    materialIntensity,
    setMaterialIntensity,
    animations,
    setAnimations,
    skins,
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
    appTheme
  } = useSkin();

  const [layout, setLayout] = useState('classic');
  const [bio, setBio] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [radioVisible, setRadioVisible] = useState(false);
  const [musicName, setMusicName] = useState('');
  const [musicTrackId, setMusicTrackId] = useState(null);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicError, setMusicError] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);
  const isArtist = user?.role === 'artist';

  const toggleArtistAccount = async () => {
    setRoleSaving(true);
    try {
      await updateTheme({ role: isArtist ? 'user' : 'artist' });
      await refreshUser();
    } finally {
      setRoleSaving(false);
    }
  };

  const handleLogout = () => {
    if (!window.confirm('¿Cerrar sesión?')) return;
    logout();
    navigate('/login');
  };
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTheme();
        if (!data) return;
        setLayout(data.profile_layout || 'classic');
        setBio(data.bio || '');
        setProfileVisible(data.profile_public !== false);
        setRadioVisible(Boolean(data.radio_public));
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
        if (typeof data.layout_opacity !== 'undefined') {
          const parsed = Number(data.layout_opacity);
          if (Number.isFinite(parsed)) {
            setLayoutOpacity(Math.max(0.1, Math.min(1, parsed)));
          }
        }
      } catch {
        // ignore
      }

      try {
        const { data: profilePlaylist } = await api.get('/playlists/mine/profile');
        const latestTrack = profilePlaylist?.tracks?.[profilePlaylist.tracks.length - 1];
        setMusicName(latestTrack?.title || '');
        setMusicTrackId(latestTrack?.id || null);
      } catch {
        // ignore — profile music display is best-effort
      }
    };

    load();
  }, []);

  const variantOptions = useMemo(() => Object.values(themeVariants || {}), [themeVariants]);

  const saveAll = async () => {
    setSaveStatus('saving');
    await updateTheme({
      bio,
      profile_public: profileVisible,
      radio_public: radioVisible,
      base_theme: skinId,
      theme_variant: themeVariant,
      accent_color: accentColor,
      secondary_accent: secondaryAccent,
      layout_background: layoutBackground,
      layout_border: layoutBorder,
      layout_text: layoutText,
      font_primary: fontPrimary,
      font_secondary: fontSecondary,
      font_ui: fontUi,
      font_mono: fontMono,
      layout_opacity: layoutOpacity,
      animated_background: animations,
      material_id: materialId,
      hud_grammar_id: hudId,
      layout_composition_id: layoutId,
      typography_profile_id: typographyId,
      shape_language_id: shapeId,
      visual_density: density,
      ornament_level: ornament,
      material_intensity: materialIntensity,
      profile_layout: layout
    });
    setSaveStatus('saved');
  };

  const onMusicFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMusicUploading(true);
    setMusicError('');
    try {
      const track = await uploadProfileMusic(file);
      setMusicName(track.title);
      setMusicTrackId(track.id);
    } catch {
      setMusicError('No se pudo subir la canción. Comprueba que sea un audio válido.');
    } finally {
      setMusicUploading(false);
    }
  };

  const clearMusic = async () => {
    if (!musicTrackId) return;
    try {
      const { data: profilePlaylist } = await api.get('/playlists/mine/profile');
      await api.delete(`/playlists/${profilePlaylist.id}/items/${musicTrackId}`);
      setMusicName('');
      setMusicTrackId(null);
    } catch {
      setMusicError('No se pudo quitar la canción. Inténtalo de nuevo.');
    }
  };

  if (!user) {
    return (
      <Panel>
        <Title>Cargando personalizacion...</Title>
      </Panel>
    );
  }

  return (
    <Panel id="customize" $embedded={embedded}>
      <Header>
        <div>
          <Title>{embedded ? 'Editor en tiempo real' : 'Editor de Perfil'}</Title>
          <Sub>
            {embedded
              ? 'Todo el customize vive dentro del perfil. Cada cambio se refleja en esta misma pantalla.'
              : 'Vista previa en tiempo real. Centra y equilibra tus campos para mejorar legibilidad.'}
          </Sub>
        </div>
        {!embedded && <Btn type="button" onClick={() => navigate('/profile')}>Volver al perfil</Btn>}
      </Header>

      {!embedded ? <ProfileHeader user={user} /> : null}

      <MiniPreview>
        <CardSample>
          <strong>{appTheme.meta?.name || 'Chaplin'} · {appTheme.card?.materialProfile?.name || 'Material'}</strong>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>
            HUD: {appTheme.hud?.name} · Layout: {appTheme.profile?.layout?.name}
          </p>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>
            Superficie: {appTheme.card?.materialProfile?.family} · Forma: {appTheme.card?.shape}
          </p>
        </CardSample>
        <CardSample>
          <strong>Layout actual</strong>
          <p style={{ margin: '6px 0 0', opacity: 0.8 }}>{appTheme.profile?.layout?.name || layout}</p>
        </CardSample>
      </MiniPreview>

      <FormGrid style={{ marginTop: 14 }}>
        <Section>
          <Label>Tema base</Label>
          <Select value={skinId} onChange={(e) => setSkinId(e.target.value)}>
            {Object.values(skins).map((skin) => (
              <option key={skin.id} value={skin.id}>
                {skin.name} - {skin.tagline}
              </option>
            ))}
          </Select>
          <Row style={{ marginTop: 8 }}>
            <Btn
              type="button"
              style={{ width: '100%' }}
              onClick={() => {
                const preset = skins?.[skinId];
                if (preset?.accent) setAccentColor(preset.accent);
                setSecondaryAccent('');
                setThemeVariant('default');
                setMaterialId('');
                setHudId('');
                setLayoutId('');
                setTypographyId('');
                setShapeId('');
                setDensity('');
                setOrnament(2);
                setMaterialIntensity(.72);
                setLayoutBackground('');
                setLayoutBorder('');
                setLayoutText('');
              }}
            >
              Aplicar preset completo
            </Btn>
          </Row>
        </Section>

        <Section>
          <Label>Material / textura legacy</Label>
          <Select value={themeVariant} onChange={(e) => setThemeVariant(e.target.value)}>
            {variantOptions.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name} - {variant.texture}
              </option>
            ))}
          </Select>
        </Section>

        <FullWidth>
          <Advanced>
            <summary>Superficie · {appTheme.card?.materialProfile?.name}</summary>
            <Section>
              <ChoiceGrid>
                {Object.values(materials || {}).map((material) => (
                  <ChoiceCard
                    type="button"
                    key={material.id}
                    $active={(materialId || appTheme.card?.materialId) === material.id}
                    $texture={material.texture}
                    onClick={() => setMaterialId(material.id)}
                  >
                    <strong>{material.name}</strong>
                    <span>{material.family} · rough {Math.round(material.roughness * 100)}%</span>
                  </ChoiceCard>
                ))}
              </ChoiceGrid>
            </Section>
          </Advanced>
        </FullWidth>

        <FullWidth>
          <Advanced>
            <summary>Composición avanzada</summary>
            <FormGrid style={{ marginTop: 12 }}>
              <Section>
                <Label>HUD</Label>
                <ChoiceGrid>
                  {Object.values(hudGrammars || {}).map((hud) => (
                    <ChoiceCard type="button" key={hud.id} $active={(hudId || appTheme.hud?.id) === hud.id} onClick={() => setHudId(hud.id)}>
                      <Wireframe $kind={hud.id} />
                      <strong>{hud.name}</strong>
                      <span>{hud.ornament} · {hud.density}</span>
                    </ChoiceCard>
                  ))}
                </ChoiceGrid>
              </Section>
              <Section>
                <Label>Layout</Label>
                <ChoiceGrid>
                  {Object.values(layoutCompositions || {}).map((layoutOption) => (
                    <ChoiceCard type="button" key={layoutOption.id} $active={(layoutId || appTheme.profile?.layout?.id) === layoutOption.id} onClick={() => setLayoutId(layoutOption.id)}>
                      <Wireframe $kind={layoutOption.id} />
                      <strong>{layoutOption.name}</strong>
                      <span>{layoutOption.mobile}</span>
                    </ChoiceCard>
                  ))}
                </ChoiceGrid>
              </Section>
              <Section>
                <Label>Perfil tipográfico</Label>
                <Select value={typographyId} onChange={(e) => setTypographyId(e.target.value)}>
                  <option value="">Recomendado por tema</option>
                  {Object.values(typographyProfiles || {}).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </Select>
              </Section>
              <Section>
                <Label>Lenguaje de forma</Label>
                <Select value={shapeId} onChange={(e) => setShapeId(e.target.value)}>
                  <option value="">Recomendado por tema</option>
                  {['rounded','squircle','sharp','chamfer','pill','organic','faceted','oval'].map((shape) => <option key={shape} value={shape}>{shape}</option>)}
                </Select>
              </Section>
              <Section>
                <Label>Densidad</Label>
                <Select value={density} onChange={(e) => setDensity(e.target.value)}>
                  <option value="">Recomendada por tema</option>
                  <option value="airy">Airy</option><option value="balanced">Balanced</option><option value="compact">Compact</option>
                </Select>
              </Section>
              <Section>
                <Label>Ornamento ({ornament})</Label>
                <Input type="range" min="0" max="3" step="1" value={ornament} onChange={(e) => setOrnament(Number(e.target.value))} />
              </Section>
              <Section>
                <Label>Intensidad material ({Math.round(materialIntensity * 100)}%)</Label>
                <Input type="range" min="0" max="1" step="0.01" value={materialIntensity} onChange={(e) => setMaterialIntensity(Number(e.target.value))} />
              </Section>
              <Section>
                <Btn type="button" onClick={() => { setMaterialId(''); setHudId(''); setLayoutId(''); setTypographyId(''); setShapeId(''); setDensity(''); setOrnament(2); setMaterialIntensity(.72); }}>
                  Restaurar recomendaciones
                </Btn>
              </Section>
            </FormGrid>
          </Advanced>
        </FullWidth>

        <FullWidth>
          <Advanced>
            <summary>Color y tipografía</summary>
            <FormGrid style={{ marginTop: 12 }}>
        <Section>
          <Label>Color de acento</Label>
          <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
        </Section>

        <Section>
          <Label>Acento secundario</Label>
          <Input type="color" value={secondaryAccent || appTheme.colors.secondary} onChange={(e) => setSecondaryAccent(e.target.value)} />
        </Section>

        <Section>
          <Label>Fondo de layout</Label>
          <Input type="color" value={layoutBackground || appTheme.colors.surface} onChange={(e) => setLayoutBackground(e.target.value)} />
        </Section>

        <Section>
          <Label>Contorno de layout</Label>
          <Input type="color" value={layoutBorder || appTheme.colors.primary} onChange={(e) => setLayoutBorder(e.target.value)} />
        </Section>

        <Section>
          <Label>Color de fuente</Label>
          <Input type="color" value={layoutText || appTheme.colors.text} onChange={(e) => setLayoutText(e.target.value)} />
        </Section>

        <Section>
          <Label>Fuente titular</Label>
          <Select value={fontPrimary} onChange={(e) => setFontPrimary(e.target.value)}>
            <option value="">Automatico del tema</option>
            {fontFamilyOptions.map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </Select>
        </Section>

        <Section>
          <Label>Fuente de cuerpo</Label>
          <Select value={fontSecondary} onChange={(e) => setFontSecondary(e.target.value)}>
            <option value="">Automatico del tema</option>
            {fontFamilyOptions.map((font) => (
              <option key={`secondary-${font.label}`} value={font.value}>
                {font.label}
              </option>
            ))}
          </Select>
        </Section>

        <Section>
          <Label>Fuente UI</Label>
          <Select value={fontUi} onChange={(e) => setFontUi(e.target.value)}>
            <option value="">Automatico del tema</option>
            {fontFamilyOptions.map((font) => (
              <option key={`ui-${font.label}`} value={font.value}>
                {font.label}
              </option>
            ))}
          </Select>
        </Section>

        <Section>
          <Label>Fuente mono / numérica</Label>
          <Select value={fontMono} onChange={(e) => setFontMono(e.target.value)}>
            <option value="">Automático del perfil</option>
            <option value="'Consolas', monospace">Consolas</option>
            <option value="'JetBrains Mono', 'Consolas', monospace">JetBrains Mono</option>
            <option value="'VT323', 'Consolas', monospace">VT323</option>
          </Select>
        </Section>

        <Section>
          <Label>Transparencia de layout ({Math.round(layoutOpacity * 100)}%)</Label>
          <Input
            type="range"
            min="0.10"
            max="1"
            step="0.01"
            value={layoutOpacity}
            onChange={(e) => setLayoutOpacity(Number(e.target.value))}
          />
        </Section>
            </FormGrid>
          </Advanced>
        </FullWidth>

        <FullWidth>
          <Advanced>
            <summary>Perfil y privacidad</summary>
            <FormGrid style={{ marginTop: 12 }}>
          <FullWidth>
            <Section>
            <Sub style={{ marginBottom: 8, textAlign: 'center' }}>
              La variante también ajusta orden de tarjetas, marcos y forma visual del perfil.
            </Sub>
            <CheckLine style={{ justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={animations}
                onChange={(e) => setAnimations(e.target.checked)}
              />
              Fondo animado activo
            </CheckLine>
            </Section>
          </FullWidth>

        <FullWidth>
          <Section>
            <Label>Bio corta (centrada)</Label>
            <Input type="text" value={bio} onChange={(e) => setBio(e.target.value)} />
          </Section>
        </FullWidth>

        <Section>
          <CheckLine>
            <input
              type="checkbox"
              checked={radioVisible}
              onChange={(e) => setRadioVisible(e.target.checked)}
            />
            Mostrar estado de radio
          </CheckLine>
        </Section>

        <Section>
          <Label>Tipo de cuenta</Label>
          <Sub style={{ marginBottom: 8 }}>
            {isArtist
              ? 'Cuenta de artista activa — tu perfil se muestra como creador.'
              : 'Cuenta normal. Cambiar a artista es solo una identidad visual, no cambia lo que puedes subir.'}
          </Sub>
          <Btn type="button" onClick={toggleArtistAccount} disabled={roleSaving}>
            {roleSaving ? 'Guardando...' : isArtist ? 'Volver a cuenta normal' : 'Cambiar a cuenta de artista'}
          </Btn>
        </Section>

        <Section>
          <Label>Sesión</Label>
          <Sub style={{ marginBottom: 8 }}>
            Conectado como @{user?.username}. Cierra sesión para entrar con otra cuenta o para ver la pantalla de registro.
          </Sub>
          <Btn type="button" onClick={handleLogout}>Cerrar sesión</Btn>
        </Section>

        <Section>
          <CheckLine>
            <input
              type="checkbox"
              checked={profileVisible}
              onChange={(e) => setProfileVisible(e.target.checked)}
            />
            Perfil visible
          </CheckLine>
        </Section>

        <FullWidth>
          <Section>
            <Label>Musica de perfil (archivo)</Label>
            <Input type="file" accept="audio/*" onChange={onMusicFile} disabled={musicUploading} />
            {musicUploading && <Sub style={{ marginTop: 6, textAlign: 'center' }}>Subiendo...</Sub>}
            {musicError && <Sub style={{ marginTop: 6, textAlign: 'center', color: '#ff6b6b' }}>{musicError}</Sub>}
            {musicName && !musicUploading && (
              <>
                <Sub style={{ marginTop: 6, textAlign: 'center' }}>Actual: {musicName}</Sub>
                <Row style={{ marginTop: 6, justifyContent: 'center' }}>
                  <Btn type="button" onClick={clearMusic}>Quitar musica</Btn>
                </Row>
              </>
            )}
          </Section>
        </FullWidth>
            </FormGrid>
          </Advanced>
        </FullWidth>
      </FormGrid>

      <Row style={{ marginTop: 14 }}>
        <Btn type="button" onClick={saveAll}>Guardar cambios</Btn>
        <Status>
          {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Pendiente de guardar'}
        </Status>
      </Row>
    </Panel>
  );
}