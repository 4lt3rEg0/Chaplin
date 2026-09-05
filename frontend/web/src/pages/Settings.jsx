import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Headphones, LogOut, Palette, User as UserIcon, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSkin } from '../context/SkinContext';
import { useVortex } from '../context/VortexContext';
import api, { uploadProfileMusic } from '../services/api';
import { updateTheme } from '../services/themeService';
import { PLAYER_SKIN_LIST } from '../components/ProfilePlayer/playerSkins';
import AppearanceDemo from '../components/AppearanceStudio/AppearanceDemo';
import LayoutThumb from '../components/AppearanceStudio/LayoutThumb';
import BackgroundThumb from '../components/AppearanceStudio/BackgroundThumb';
import { BACKGROUND_CATALOG } from '../components/AppearanceStudio/backgroundCatalog';
import { resolveWidgetRadius } from '../styles/hudTokens';

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

const FONT_OPTIONS = [
  { id: '', label: 'Recomendada por tema' },
  { id: "'Segoe UI', sans-serif", label: 'Segoe UI (moderna)' },
  { id: "'Georgia', serif", label: 'Georgia (editorial)' },
  { id: "'Consolas', monospace", label: 'Consolas (técnica)' },
  { id: "'Trebuchet MS', sans-serif", label: 'Trebuchet (suave)' },
  { id: "'Arial Narrow', sans-serif", label: 'Arial Narrow (compacta)' },
  { id: "'Courier New', monospace", label: 'Courier (máquina de escribir)' },
  { id: "'Comic Sans MS', sans-serif", label: 'Comic Sans (juguetona)' }
];

const buildAppearanceSnapshot = (skin, vortex) => ({
  skinId: skin.skinId,
  accentColor: skin.accentColor,
  secondaryAccent: skin.secondaryAccent || '#7ee8ff',
  themeVariant: skin.themeVariant,
  animations: skin.animations,
  layoutId: skin.layoutId || skin.appTheme?.profile?.layout?.id || 'balanced',
  fontPrimary: skin.fontPrimary || '',
  textColor: skin.layoutText || '',
  playerSkinId: skin.playerSkinId,
  backgroundStyle: vortex.backgroundStyle,
  finishType: vortex.finishType,
  vortexColor: vortex.vortexColor
});

const StudioGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DemoCol = styled.div`
  position: sticky;
  top: 60px;

  @media (max-width: 900px) {
    position: static;
    order: -1;
  }
`;

const ConfigCol = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const StudioSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StudioSectionTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CatalogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  max-height: ${({ $scroll }) => ($scroll ? '340px' : 'none')};
  overflow-y: ${({ $scroll }) => ($scroll ? 'auto' : 'visible')};
  padding-right: ${({ $scroll }) => ($scroll ? '4px' : '0')};
`;

const CatalogCard = styled.button`
  border: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: #05070b;
  padding: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
  box-shadow: ${({ $active, theme }) => ($active ? `0 0 0 2px ${theme.colors.primary}55` : 'none')};
`;

const CatalogThumbBox = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
`;

const CatalogLabel = styled.span`
  font-size: 10px;
  padding: 5px 6px;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ThemeSwatch = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  background: ${({ $bg }) => $bg};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 6px;
    left: 6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${({ $accent }) => $accent};
    box-shadow: 0 0 6px ${({ $accent }) => $accent};
  }
`;

const PlayerSkinCardWrap = styled.div`
  transform: scale(0.82);
  transform-origin: top left;
  width: 122%;
  pointer-events: none;
`;

const StudioActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
`;

function AparienciaSection() {
  const skin = useSkin();
  const vortex = useVortex();
  const savedRef = useRef(buildAppearanceSnapshot(skin, vortex));
  const [draft, setDraft] = useState(savedRef.current);
  const [saveStatus, setSaveStatus] = useState('idle');

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedRef.current);

  const patch = (fields) => {
    setDraft((prev) => ({ ...prev, ...fields }));
    setSaveStatus('idle');
  };

  const handleApply = () => {
    setSaveStatus('saving');
    skin.setSkinId(draft.skinId);
    skin.setAccentColor(draft.accentColor);
    skin.setSecondaryAccent(draft.secondaryAccent);
    skin.setThemeVariant(draft.themeVariant);
    skin.setAnimations(draft.animations);
    skin.setLayoutId(draft.layoutId);
    skin.setLayoutText(draft.textColor);
    skin.setFontPrimary(draft.fontPrimary);
    skin.setFontSecondary(draft.fontPrimary);
    skin.setFontUi(draft.fontPrimary);
    skin.setPlayerSkinId(draft.playerSkinId);
    vortex.setBackgroundStyle(draft.backgroundStyle);
    vortex.setFinishType(draft.finishType);
    vortex.setVortexColor(draft.vortexColor);
    savedRef.current = draft;
    setSaveStatus('saved');
  };

  const handleCancel = () => {
    setDraft(savedRef.current);
    setSaveStatus('idle');
  };

  const themeOptions = Object.values(skin.skins || {});
  const layoutOptions = Object.values(skin.layoutCompositions || {});

  return (
    <>
      <SectionTitle>Apariencia</SectionTitle>
      <SectionSub>
        Layout, tema, fondo, fuente, colores y el reproductor de tu perfil, todo en un mismo configurador —
        la demo de al lado se actualiza al instante con la combinación completa. Nada se guarda hasta pulsar Aplicar.
      </SectionSub>

      <StudioGrid>
        <ConfigCol>
          <StudioSection>
            <StudioSectionTitle>Layout</StudioSectionTitle>
            <CatalogGrid>
              {layoutOptions.map((layout) => (
                <CatalogCard key={layout.id} type="button" $active={draft.layoutId === layout.id} onClick={() => patch({ layoutId: layout.id })}>
                  <CatalogThumbBox>
                    <LayoutThumb archetype={layout.desktop} colorA={draft.accentColor} colorB={draft.secondaryAccent} />
                  </CatalogThumbBox>
                  <CatalogLabel>{layout.name}</CatalogLabel>
                </CatalogCard>
              ))}
            </CatalogGrid>
          </StudioSection>

          <StudioSection>
            <StudioSectionTitle>Tema</StudioSectionTitle>
            <CatalogGrid>
              {themeOptions.map((preset) => (
                <CatalogCard
                  key={preset.id}
                  type="button"
                  $active={draft.skinId === preset.id}
                  onClick={() => patch({ skinId: preset.id, accentColor: preset.accent })}
                >
                  <ThemeSwatch $bg={preset.background || '#111'} $accent={preset.accent} />
                  <CatalogLabel>{preset.name}</CatalogLabel>
                </CatalogCard>
              ))}
            </CatalogGrid>
          </StudioSection>

          <StudioSection>
            <StudioSectionTitle>Fondo</StudioSectionTitle>
            <CatalogGrid $scroll>
              {BACKGROUND_CATALOG.map((bg) => (
                <CatalogCard key={bg.id} type="button" $active={draft.backgroundStyle === bg.id} onClick={() => patch({ backgroundStyle: bg.id })}>
                  <CatalogThumbBox><BackgroundThumb id={bg.id} /></CatalogThumbBox>
                  <CatalogLabel>{bg.label}</CatalogLabel>
                </CatalogCard>
              ))}
            </CatalogGrid>
          </StudioSection>

          <StudioSection>
            <StudioSectionTitle>Fuente y colores</StudioSectionTitle>
            <FieldGroup>
              <Label>Fuente</Label>
              <Select value={draft.fontPrimary} onChange={(e) => patch({ fontPrimary: e.target.value })}>
                {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Color primario</Label>
              <Input type="color" value={draft.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} />
              {' '}
              <Label style={{ display: 'inline-block', marginLeft: 12 }}>Color secundario</Label>
              <Input type="color" value={draft.secondaryAccent} onChange={(e) => patch({ secondaryAccent: e.target.value })} />
              {' '}
              <Label style={{ display: 'inline-block', marginLeft: 12 }}>Color de texto</Label>
              <Input type="color" value={draft.textColor || '#ffffff'} onChange={(e) => patch({ textColor: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <CheckRow>
                <input type="checkbox" checked={draft.animations} onChange={(e) => patch({ animations: e.target.checked })} />
                Fondo animado activo
              </CheckRow>
            </FieldGroup>
          </StudioSection>

          <StudioSection>
            <StudioSectionTitle>Skin del reproductor de perfil</StudioSectionTitle>
            <CatalogGrid>
              {PLAYER_SKIN_LIST.map((option) => {
                const SkinComp = option.component;
                return (
                  <CatalogCard key={option.id} type="button" $active={draft.playerSkinId === option.id} onClick={() => patch({ playerSkinId: option.id })}>
                    <CatalogThumbBox style={{ background: '#0a0a10', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <PlayerSkinCardWrap>
                        <SkinComp
                          track={{ title: 'Demo', owner_username: 'tu' }}
                          mode="all"
                          modeLabel=""
                          isActive={false}
                          isPlaying={false}
                          hasQueue={false}
                          onToggleEar={() => {}}
                          onPrev={() => {}}
                          onNext={() => {}}
                          ariaLabel="preview"
                        />
                      </PlayerSkinCardWrap>
                    </CatalogThumbBox>
                    <CatalogLabel>{option.label}</CatalogLabel>
                  </CatalogCard>
                );
              })}
            </CatalogGrid>
          </StudioSection>
        </ConfigCol>

        <DemoCol>
          <AppearanceDemo draft={draft} />
          <StudioActions>
            <GhostBtn type="button" onClick={handleCancel} disabled={!isDirty}>
              <X size={14} /> Cancelar
            </GhostBtn>
            <Btn type="button" onClick={handleApply} disabled={!isDirty}>
              <Check size={14} /> Aplicar cambios
            </Btn>
          </StudioActions>
          {saveStatus === 'saved' && <StatusText>Guardado.</StatusText>}
        </DemoCol>
      </StudioGrid>
    </>
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
