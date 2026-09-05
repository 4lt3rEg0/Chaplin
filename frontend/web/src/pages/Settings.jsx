import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Headphones, Image as ImageIcon, LayoutGrid, LogOut,
  Palette, User as UserIcon, Wand2, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSkin } from '../context/SkinContext';
import { useVortex } from '../context/VortexContext';
import api, { uploadProfileMusic } from '../services/api';
import { updateTheme } from '../services/themeService';
import BackgroundConfigurator from '../components/BackgroundConfigurator';
import { PLAYER_SKINS, PLAYER_SKIN_LIST, DEFAULT_PLAYER_SKIN } from '../components/ProfilePlayer/playerSkins';
import {
  resolveShapeClipPath,
  resolveShapeRadius,
  resolveWidgetRadius
} from '../styles/hudTokens';

const Wrapper = styled.div`
  background: ${({ theme }) => theme.gradients.page};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100dvh;
  padding-top: var(--chaplin-player-panel-offset, 0px);
  padding-bottom: calc(var(--chaplin-mobile-dock-offset, 0px) + 16px);
`;

const Shell = styled.div`
  max-width: min(var(--chaplin-shell-max, 960px), 100%);
  margin: 0 auto;
  padding: 20px 14px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const HeaderRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
`;

const BackButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  color: ${({ theme }) => theme.colors.text};
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.04em;
`;

const TabNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 760px) {
    flex-direction: row;
    overflow-x: auto;
  }
`;

const TabButton = styled.button`
  border: 1px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? (theme.colors.accentSoft || 'rgba(255,255,255,0.08)') : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  white-space: nowrap;

  @media (max-width: 760px) {
    flex-shrink: 0;
  }
`;

const Content = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  padding: 20px;
  min-width: 0;
`;

const SectionTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 16px;
`;

const SectionSub = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FieldGroup = styled.div`
  margin-bottom: 18px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Select = styled.select`
  width: 100%;
  max-width: 360px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 10px;
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 10px;
`;

const Textarea = styled.textarea`
  width: 100%;
  max-width: 480px;
  min-height: 90px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 10px;
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 10px;
`;

const ChoiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr));
  gap: 8px;
`;

const ChoiceCard = styled.button.attrs((props) => ({ 'data-shape': props.$shape || 'rounded' }))`
  min-height: 76px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme, $shape }) => resolveShapeRadius($shape, theme.card?.radius || '10px')};
  clip-path: ${({ $shape }) => resolveShapeClipPath($shape)};
  padding: 10px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow: ${({ theme, $active }) => ($active ? `inset 0 0 0 1px ${theme.colors.primary}` : 'none')};
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: center;

  strong { font-size: 12px; display: block; }
  span { font-size: 10px; opacity: 0.7; display: block; margin-top: 4px; }
`;

const Btn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => resolveWidgetRadius(theme.card?.widgetShape || 'rounded')};
  padding: 9px 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const GhostBtn = styled(Btn)`
  background: transparent;
`;

const PreviewBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: ${({ theme }) => theme.colors.primary}22;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 12px;
  flex-wrap: wrap;
`;

const RowButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const StatusText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TABS = [
  { id: 'apariencia', label: 'Apariencia', icon: Palette },
  { id: 'reproduccion', label: 'Reproducción', icon: Headphones },
  { id: 'perfil', label: 'Otras preferencias', icon: UserIcon },
  { id: 'cuenta', label: 'Cuenta', icon: UserIcon }
];

const InnerTabNav = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 18px;
`;

const InnerTabButton = styled.button`
  border: 1px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? (theme.colors.accentSoft || 'rgba(255,255,255,0.08)') : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const APARIENCIA_INNER_TABS = [
  { id: 'temas', label: 'Temas', icon: Palette },
  { id: 'layouts', label: 'Layouts', icon: LayoutGrid },
  { id: 'fondos', label: 'Fondos', icon: ImageIcon },
  { id: 'slides', label: 'Slides de preview', icon: Wand2 }
];

/* ============== Apariencia: sesión de preview unificada ============== */
/* Envuelve Temas/Layouts/Fondos/Slides en UN solo ciclo de preview
   (tema + fondo a la vez), con un único Cancelar/Aplicar arriba — así
   cambiar de sub-pestaña no rompe ni duplica la sesión de previsualización. */
function AparienciaSection() {
  const skin = useSkin();
  const vortex = useVortex();
  const [innerTab, setInnerTab] = useState('temas');
  const [saveStatus, setSaveStatus] = useState('idle');
  const committedRef = useRef(false);

  useEffect(() => {
    skin.beginThemePreview();
    vortex.beginVortexPreview();
    committedRef.current = false;
    return () => {
      if (!committedRef.current) {
        skin.cancelThemePreview();
        vortex.cancelVortexPreview();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-arms a fresh preview session immediately after Aplicar/Cancelar so the
  // tab stays continuously previewable for as long as it's open — only truly
  // leaving Apariencia (unmount) ends the session without a new one.
  const rearm = () => {
    skin.beginThemePreview();
    vortex.beginVortexPreview();
    committedRef.current = false;
  };

  const handleApply = () => {
    setSaveStatus('saving');
    skin.commitThemePreview();
    vortex.commitVortexPreview();
    committedRef.current = true;
    setSaveStatus('saved');
    rearm();
  };

  const handleCancel = () => {
    skin.cancelThemePreview();
    vortex.cancelVortexPreview();
    committedRef.current = true;
    setInnerTab('temas');
    rearm();
  };

  return (
    <>
      {skin.isPreviewingTheme && (
        <PreviewBar>
          <span>Estás previsualizando temas, layouts, fondos y skin del reproductor. Nada se guarda todavía.</span>
          <RowButtons>
            <GhostBtn type="button" onClick={handleCancel}>
              <X size={14} /> Cancelar
            </GhostBtn>
            <Btn type="button" onClick={handleApply}>
              <Check size={14} /> Aplicar cambios
            </Btn>
          </RowButtons>
        </PreviewBar>
      )}

      <SectionTitle>Apariencia</SectionTitle>
      <SectionSub>Temas, layouts, fondos y el skin del reproductor de perfil viven juntos aquí — pruébalos y confirma o cancela una sola vez.</SectionSub>

      <InnerTabNav>
        {APARIENCIA_INNER_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <InnerTabButton key={tab.id} type="button" $active={innerTab === tab.id} onClick={() => setInnerTab(tab.id)}>
              <Icon size={12} /> {tab.label}
            </InnerTabButton>
          );
        })}
      </InnerTabNav>

      {innerTab === 'temas' && <TemasPanel />}
      {innerTab === 'layouts' && <LayoutsPanel />}
      {innerTab === 'fondos' && <FondosPanel />}
      {innerTab === 'slides' && <SlidesPanel />}

      {saveStatus === 'saved' && <StatusText>Guardado.</StatusText>}
    </>
  );
}

function TemasPanel() {
  const {
    skinId, setSkinId, skins,
    accentColor, setAccentColor,
    secondaryAccent, setSecondaryAccent,
    themeVariant, setThemeVariant, themeVariants,
    materialId, setMaterialId, materials,
    hudId, setHudId, hudGrammars,
    typographyId, setTypographyId, typographyProfiles,
    shapeId, setShapeId,
    density, setDensity,
    ornament, setOrnament,
    materialIntensity, setMaterialIntensity,
    layoutOpacity, setLayoutOpacity,
    animations, setAnimations
  } = useSkin();

  const variantOptions = Object.values(themeVariants || {});

  return (
    <>
      <FieldGroup>
        <Label>Tema base</Label>
        <Select value={skinId} onChange={(e) => setSkinId(e.target.value)}>
          {Object.values(skins).map((skin) => (
            <option key={skin.id} value={skin.id}>{skin.name} — {skin.tagline}</option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label>Variante / textura</Label>
        <Select value={themeVariant} onChange={(e) => setThemeVariant(e.target.value)}>
          {variantOptions.map((variant) => (
            <option key={variant.id} value={variant.id}>{variant.name} — {variant.texture}</option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label>Color de acento</Label>
        <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
      </FieldGroup>

      <FieldGroup>
        <Label>Acento secundario</Label>
        <Input type="color" value={secondaryAccent || '#7ee8ff'} onChange={(e) => setSecondaryAccent(e.target.value)} />
      </FieldGroup>

      <FieldGroup>
        <CheckRow>
          <input type="checkbox" checked={animations} onChange={(e) => setAnimations(e.target.checked)} />
          Fondo animado activo
        </CheckRow>
      </FieldGroup>

      <details>
        <summary style={{ cursor: 'pointer', marginBottom: 12 }}>Avanzado</summary>

        <FieldGroup>
          <Label>Superficie / material</Label>
          <ChoiceGrid>
            {Object.values(materials || {}).map((material) => (
              <ChoiceCard type="button" key={material.id} $active={materialId === material.id} onClick={() => setMaterialId(material.id)}>
                <strong>{material.name}</strong>
                <span>{material.family}</span>
              </ChoiceCard>
            ))}
          </ChoiceGrid>
        </FieldGroup>

        <FieldGroup>
          <Label>HUD</Label>
          <ChoiceGrid>
            {Object.values(hudGrammars || {}).map((hud) => (
              <ChoiceCard type="button" key={hud.id} $active={hudId === hud.id} onClick={() => setHudId(hud.id)}>
                <strong>{hud.name}</strong>
                <span>{hud.density}</span>
              </ChoiceCard>
            ))}
          </ChoiceGrid>
        </FieldGroup>

        <FieldGroup>
          <Label>Perfil tipográfico</Label>
          <Select value={typographyId} onChange={(e) => setTypographyId(e.target.value)}>
            <option value="">Recomendado por tema</option>
            {Object.values(typographyProfiles || {}).map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label>Lenguaje de forma</Label>
          <Select value={shapeId} onChange={(e) => setShapeId(e.target.value)}>
            <option value="">Recomendado por tema</option>
            {['rounded', 'squircle', 'sharp', 'chamfer', 'pill', 'organic', 'faceted', 'oval'].map((shape) => <option key={shape} value={shape}>{shape}</option>)}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label>Densidad</Label>
          <Select value={density} onChange={(e) => setDensity(e.target.value)}>
            <option value="">Recomendada por tema</option>
            <option value="airy">Airy</option>
            <option value="balanced">Balanced</option>
            <option value="compact">Compact</option>
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label>Ornamento ({ornament})</Label>
          <input type="range" min="0" max="3" step="1" value={ornament} onChange={(e) => setOrnament(Number(e.target.value))} style={{ width: '100%', maxWidth: 360 }} />
        </FieldGroup>

        <FieldGroup>
          <Label>Intensidad material ({Math.round(materialIntensity * 100)}%)</Label>
          <input type="range" min="0" max="1" step="0.01" value={materialIntensity} onChange={(e) => setMaterialIntensity(Number(e.target.value))} style={{ width: '100%', maxWidth: 360 }} />
        </FieldGroup>

        <FieldGroup>
          <Label>Transparencia de layout ({Math.round(layoutOpacity * 100)}%)</Label>
          <input type="range" min="0.1" max="1" step="0.01" value={layoutOpacity} onChange={(e) => setLayoutOpacity(Number(e.target.value))} style={{ width: '100%', maxWidth: 360 }} />
        </FieldGroup>
      </details>
    </>
  );
}

function LayoutsPanel() {
  const { layoutId, setLayoutId, layoutCompositions, appTheme } = useSkin();

  return (
    <>
      <SectionSub>La composición de tarjetas y estructura visual del perfil.</SectionSub>
      <ChoiceGrid>
        {Object.values(layoutCompositions || {}).map((layoutOption) => (
          <ChoiceCard
            type="button"
            key={layoutOption.id}
            $active={(layoutId || appTheme.profile?.layout?.id) === layoutOption.id}
            onClick={() => setLayoutId(layoutOption.id)}
          >
            <strong>{layoutOption.name}</strong>
            <span>{layoutOption.mobile}</span>
          </ChoiceCard>
        ))}
      </ChoiceGrid>
    </>
  );
}

function FondosPanel() {
  return (
    <>
      <SectionSub>El fondo animado de toda la app.</SectionSub>
      <BackgroundConfigurator />
    </>
  );
}

/* ============== Slides de preview ============== */
/* Curated preset combos (theme + layout + fondo + player skin) the user can
   browse like a carousel and try live — all through the same preview session
   AparienciaSection already opened, so Cancelar/Aplicar there covers this too. */
const PRESET_SLIDES = [
  {
    id: 'chrome-y2k',
    name: 'Y2K Chrome',
    description: 'El clásico Chaplin: cromados, acento cian, fondo de vórtice.',
    skinId: 'y2k', themeVariant: 'default', accentColor: '#7ee8ff', secondaryAccent: '#ff8ad8',
    layoutId: 'classic', playerSkinId: 'daw',
    vortex: { backgroundStyle: 'video01', finishType: 'pearlescent' }
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    description: 'Contraste alto, magenta/verde ácido, HUD denso.',
    skinId: 'cyberpunk', themeVariant: 'default', accentColor: '#ff2fd0', secondaryAccent: '#39ff88',
    layoutId: 'grid', playerSkinId: 'blender3d',
    vortex: { backgroundStyle: 'video02', finishType: 'glossy' }
  },
  {
    id: 'retro-ipod',
    name: 'MP3 Retro',
    description: 'Paleta pastel, formas suaves, reproductor estilo iPod.',
    skinId: 'chrome', themeVariant: 'soft', accentColor: '#ffb997', secondaryAccent: '#c9f2ff',
    layoutId: 'classic', playerSkinId: 'ipod',
    vortex: { backgroundStyle: 'sphere', finishType: 'chrome' }
  },
  {
    id: 'hud-3d',
    name: 'HUD 3D',
    description: 'Rejillas neón y aire retro-futurista, consola de audio.',
    skinId: 'void4d', themeVariant: 'default', accentColor: '#00e5ff', secondaryAccent: '#ff00c8',
    layoutId: 'grid', playerSkinId: 'blender3d',
    vortex: { backgroundStyle: 'video04', finishType: 'pearlescent' }
  }
];

const SlideShell = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 16px;
  background: ${({ theme }) => theme.gradients?.panel || theme.card?.bg};
`;

const SlideNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const SlideDots = styled.div`
  display: flex;
  gap: 6px;
`;

const SlideDot = styled.button`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
`;

const MockComposition = styled.div`
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  margin-bottom: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 48px 1fr;
  }
`;

const MockAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.card?.radius || '50%'};
  background: ${({ theme }) => theme.gradients?.chrome || theme.colors.accentSoft};

  @media (max-width: 480px) {
    width: 48px;
    height: 48px;
  }
`;

const MockName = styled.div`
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 4px;
`;

const MockBio = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;

const MockCardRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
`;

const MockCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 10px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  font-size: 11px;
`;

const SkinChoiceRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const SkinChoiceBtn = styled.button`
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
`;

const SlideFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const DEMO_TRACK = { title: 'Vista previa', owner_username: 'tu_perfil', artwork_url: null };

function SlidesPanel() {
  const {
    setSkinId, setThemeVariant,
    accentColor, setAccentColor, secondaryAccent, setSecondaryAccent, setLayoutId,
    playerSkinId, setPlayerSkinId
  } = useSkin();
  const { setBackgroundStyle, setFinishType } = useVortex();
  const [slideIndex, setSlideIndex] = useState(0);

  const slide = PRESET_SLIDES[slideIndex];
  const SkinComponent = (PLAYER_SKINS[playerSkinId] || PLAYER_SKINS[DEFAULT_PLAYER_SKIN]).component;

  const applyPreset = (preset) => {
    setSkinId(preset.skinId);
    setThemeVariant(preset.themeVariant);
    setAccentColor(preset.accentColor);
    setSecondaryAccent(preset.secondaryAccent);
    setLayoutId(preset.layoutId);
    setPlayerSkinId(preset.playerSkinId);
    if (preset.vortex?.backgroundStyle) setBackgroundStyle(preset.vortex.backgroundStyle);
    if (preset.vortex?.finishType) setFinishType(preset.vortex.finishType);
  };

  return (
    <SlideShell>
      <SlideNav>
        <GhostBtn type="button" onClick={() => setSlideIndex((i) => (i - 1 + PRESET_SLIDES.length) % PRESET_SLIDES.length)}>
          ‹ Anterior
        </GhostBtn>
        <SlideDots>
          {PRESET_SLIDES.map((s, i) => (
            <SlideDot key={s.id} type="button" $active={i === slideIndex} onClick={() => setSlideIndex(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </SlideDots>
        <GhostBtn type="button" onClick={() => setSlideIndex((i) => (i + 1) % PRESET_SLIDES.length)}>
          Siguiente ›
        </GhostBtn>
      </SlideNav>

      <SectionTitle>{slide.name}</SectionTitle>
      <SectionSub>{slide.description}</SectionSub>

      <MockComposition>
        <MockAvatar />
        <div>
          <MockName>Vista previa de composición</MockName>
          <MockBio>Así lucirían tu nombre, bio y avatar con esta combinación.</MockBio>
        </div>
      </MockComposition>

      <MockCardRow>
        <MockCard>Publicación</MockCard>
        <MockCard>Tarjeta</MockCard>
        <MockCard>Metadato</MockCard>
      </MockCardRow>

      <FieldGroup>
        <Label>Skin del reproductor de perfil</Label>
        <SkinChoiceRow>
          {PLAYER_SKIN_LIST.map((option) => (
            <SkinChoiceBtn
              key={option.id}
              type="button"
              $active={playerSkinId === option.id}
              onClick={() => setPlayerSkinId(option.id)}
            >
              {option.label}
            </SkinChoiceBtn>
          ))}
        </SkinChoiceRow>
        <SkinComponent
          track={DEMO_TRACK}
          mode="all"
          modeLabel="Vista previa"
          isActive={false}
          isPlaying={false}
          hasQueue={false}
          onToggleEar={() => {}}
          onPrev={() => {}}
          onNext={() => {}}
          ariaLabel="Vista previa del reproductor"
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Color primario</Label>
        <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
        {' '}
        <Label style={{ display: 'inline-block', marginLeft: 12 }}>Color secundario</Label>
        <Input type="color" value={secondaryAccent || '#7ee8ff'} onChange={(e) => setSecondaryAccent(e.target.value)} />
      </FieldGroup>

      <SlideFooter>
        <StatusText>Slide {slideIndex + 1} de {PRESET_SLIDES.length}</StatusText>
        <Btn type="button" onClick={() => applyPreset(slide)}>
          <Wand2 size={14} /> Probar este estilo
        </Btn>
      </SlideFooter>
    </SlideShell>
  );
}

function PerfilTab() {
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [radioPublic, setRadioPublic] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [profilePlaylist, setProfilePlaylist] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me');
        setBio(data.bio || '');
        setProfilePublic(data.profile_public !== false);
        setRadioPublic(Boolean(data.radio_public));
      } catch {
        // ignore
      }
      try {
        const { data } = await api.get('/playlists/mine/profile');
        setProfilePlaylist(data);
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveProfileFields = async () => {
    setSaveStatus('saving');
    try {
      await updateTheme({ bio, profile_public: profilePublic, radio_public: radioPublic });
      await refreshUser();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const togglePin = async () => {
    if (!profilePlaylist || pinBusy) return;
    setPinBusy(true);
    const nextVisibility = profilePlaylist.visibility === 'public' ? 'private' : 'public';
    try {
      const { data } = await api.put(`/playlists/${profilePlaylist.id}`, { visibility: nextVisibility });
      setProfilePlaylist(data);
    } finally {
      setPinBusy(false);
    }
  };

  const pinned = profilePlaylist?.visibility === 'public';

  return (
    <>
      <SectionTitle>Otras preferencias</SectionTitle>
      <SectionSub>Información pública y preferencias de tu perfil.</SectionSub>

      <FieldGroup>
        <Label>Bio corta</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      </FieldGroup>

      <FieldGroup>
        <CheckRow>
          <input type="checkbox" checked={profilePublic} onChange={(e) => setProfilePublic(e.target.checked)} />
          Perfil visible para otros usuarios
        </CheckRow>
        <CheckRow>
          <input type="checkbox" checked={radioPublic} onChange={(e) => setRadioPublic(e.target.checked)} />
          Mostrar estado de radio en mi perfil
        </CheckRow>
      </FieldGroup>

      <FieldGroup>
        <Btn type="button" onClick={saveProfileFields}>Guardar</Btn>{' '}
        <StatusText>
          {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : saveStatus === 'error' ? 'Error al guardar' : ''}
        </StatusText>
      </FieldGroup>

      <FieldGroup style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
        <Label>Lista de reproducción en mi perfil</Label>
        <SectionSub>
          {pinned
            ? 'Tu playlist de perfil es visible para cualquiera que te visite.'
            : 'Tu playlist de perfil está oculta — tus canciones siguen existiendo, solo no se muestran públicamente.'}
        </SectionSub>
        <Btn type="button" onClick={togglePin} disabled={!profilePlaylist || pinBusy}>
          {pinned ? 'Ocultar del perfil' : 'Fijar en mi perfil'}
        </Btn>
      </FieldGroup>
    </>
  );
}

const PLAYBACK_MODE_OPTIONS = [
  { id: 'all', label: 'Reproducir toda mi música', hint: 'Cualquier visitante escucha tus pistas públicas, de la más nueva a la más antigua.' },
  { id: 'favorites', label: 'Solo favoritas', hint: 'Solo suenan las pistas que marques con la estrella en tu pestaña Música.' },
  { id: 'radio', label: 'Radio Chaplin', hint: 'Tu reproductor de perfil usa la emisora global de Chaplin en vez de tu música personal.' }
];

const RadioOptionRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: 10px;
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft : 'transparent')};
  cursor: pointer;
  margin-bottom: 8px;
`;

const RadioOptionText = styled.div`
  strong { display: block; font-size: 13px; }
  span { display: block; font-size: 11px; opacity: 0.7; margin-top: 2px; }
`;

function ReproduccionTab() {
  const { user, refreshUser } = useAuth();
  const [mode, setMode] = useState(user?.profile_playback_mode || 'all');
  const [saveStatus, setSaveStatus] = useState('idle');

  const applyMode = async (nextMode) => {
    setMode(nextMode);
    setSaveStatus('saving');
    try {
      const form = new FormData();
      form.append('profile_playback_mode', nextMode);
      await api.put('/users/me', form);
      await refreshUser();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <>
      <SectionTitle>Reproducción del perfil</SectionTitle>
      <SectionSub>Elige qué suena cuando alguien visita tu perfil y toca el icono de oreja del reproductor.</SectionSub>

      {PLAYBACK_MODE_OPTIONS.map((option) => (
        <RadioOptionRow key={option.id} $active={mode === option.id}>
          <input
            type="radio"
            name="profile-playback-mode"
            checked={mode === option.id}
            onChange={() => applyMode(option.id)}
          />
          <RadioOptionText>
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </RadioOptionText>
        </RadioOptionRow>
      ))}

      <StatusText>
        {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : saveStatus === 'error' ? 'Error al guardar' : ''}
      </StatusText>
    </>
  );
}

function CuentaTab() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [roleSaving, setRoleSaving] = useState(false);
  const isArtist = user?.role === 'artist';

  const toggleArtist = async () => {
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

  return (
    <>
      <SectionTitle>Cuenta</SectionTitle>
      <SectionSub>Conectado como @{user?.username}.</SectionSub>

      <FieldGroup>
        <Label>Tipo de cuenta</Label>
        <SectionSub>
          {isArtist
            ? 'Cuenta de artista activa — tu perfil se muestra como creador.'
            : 'Cuenta normal. Cambiar a artista es una identidad visual; no cambia lo que puedes subir.'}
        </SectionSub>
        <Btn type="button" onClick={toggleArtist} disabled={roleSaving}>
          {roleSaving ? 'Guardando...' : isArtist ? 'Volver a cuenta normal' : 'Cambiar a cuenta de artista'}
        </Btn>
      </FieldGroup>

      <FieldGroup>
        <Label>Sesión</Label>
        <GhostBtn type="button" onClick={handleLogout}>
          <LogOut size={14} /> Cerrar sesión
        </GhostBtn>
      </FieldGroup>
    </>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('apariencia');

  return (
    <Wrapper>
      <Shell>
        <HeaderRow>
          <BackButton type="button" onClick={() => navigate('/profile')} aria-label="Volver al perfil">
            <ArrowLeft size={16} />
          </BackButton>
          <PageTitle>Configuración</PageTitle>
        </HeaderRow>

        <TabNav>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabButton key={tab.id} type="button" $active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
                <Icon size={14} />
                {tab.label}
              </TabButton>
            );
          })}
        </TabNav>

        <Content>
          {activeTab === 'apariencia' && <AparienciaSection />}
          {activeTab === 'reproduccion' && <ReproduccionTab />}
          {activeTab === 'perfil' && <PerfilTab />}
          {activeTab === 'cuenta' && <CuentaTab />}
        </Content>
      </Shell>
    </Wrapper>
  );
}
