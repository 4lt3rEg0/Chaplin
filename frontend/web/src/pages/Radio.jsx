import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { useVortex } from "../context/VortexContext";
import { useSkin } from "../context/SkinContext";
import RadioSubmissionsReview from "../components/RadioSubmissionsReview";

const Wrapper = styled.div`
  background: ${({ theme }) => theme.gradients.page};
  color: ${({ theme }) => theme.colors.text};
`;

const Container = styled.div`
  max-width: min(var(--chaplin-shell-max, 1220px), 100%);
  margin: 0 auto;
`;

const RadioGrid = styled.div`
  display: block;
`;

const LeftArea = styled.aside`
  display: none;
`;

const CenterArea = styled.main`
  display: block;
`;

const RightArea = styled.aside`
  display: none;
`;

const SidePanel = styled.section`
  padding: 14px;
  display: grid;
  gap: 10px;
`;

const SideTitle = styled.h3`
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 50px;
  font-size: 42px;
  letter-spacing: 4px;
  background: ${({ theme }) => theme.gradients.chrome};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 760px) {
    margin-bottom: 20px;
    font-size: 28px;
    letter-spacing: 2px;
  }
`;

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 760px) {
    margin-bottom: 20px;
  }
`;

const Tab = styled.button`
  background: ${({ $active, theme }) => $active ? theme.colors.accentSoft : 'transparent'};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  padding: 12px 24px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 16px;
  letter-spacing: 1px;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.accentSoft};
  }

  @media (max-width: 760px) {
    flex: 1;
    padding: 10px 12px;
    font-size: 14px;
  }
`;

const TrackCard = styled.div`
  padding: 30px;
  margin-bottom: 35px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 760px) {
    padding: 16px;
    margin-bottom: 18px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const TrackTitle = styled.div`
  font-size: 16px;
  letter-spacing: 1px;
  flex: 1;

  @media (max-width: 760px) {
    font-size: 14px;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;

  @media (max-width: 760px) {
    width: 100%;
    flex-wrap: wrap;
  }
`;

const Button = styled.button`
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.accentSoft};
  }

  @media (max-width: 760px) {
    flex: 1;
    min-width: 140px;
  }
`;

const ConfigContainer = styled.div`
  padding: 30px;

  @media (max-width: 760px) {
    padding: 16px;
  }
`;

const ConfigTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 30px;
  text-align: center;
  letter-spacing: 2px;

  @media (max-width: 760px) {
    margin-bottom: 16px;
    font-size: 20px;
    letter-spacing: 1px;
  }
`;

const SyncHint = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
`;

export default function Radio() {
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [tracksError, setTracksError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('radio');
  const uploadInputRef = useRef(null);
  const { skinId, appTheme, themeVariant } = useSkin();
  const { backgroundStyle } = useVortex();
  const {
    play,
    current,
    replaceQueue,
    chaplinRadioTracks,
    setChaplinRadioTracks,
    playFromSource,
    setActiveSource
  } = usePlayer();

  const layoutTemplate = appTheme.profile?.layoutTemplate || 'classic';

  const radioQueue = useMemo(
    () => (chaplinRadioTracks.length ? chaplinRadioTracks : tracks
      .filter((track) => track.media_url)
      .map((track) => ({
        id: track.id,
        src: track.media_url,
        title: track.content || "Untitled Track",
        artist: track.owner_username || "Chaplin Radio"
      }))),
    [tracks, chaplinRadioTracks]
  );

  const resolveTracksErrorMessage = (error, fallback) => {
    const status = error?.response?.status;
    if (status === 401) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión para usar la radio.';
    }
    if (status === 404) {
      return 'No se encontró /api/v1/posts en backend. Revisa que el backend esté levantado en 8000.';
    }
    if (error?.code === 'ECONNABORTED' || !error?.response) {
      return 'No se pudo conectar con backend. Arranca backend en 8000 y frontend con runchaplin.';
    }
    return fallback;
  };

  useEffect(() => {
    if (!radioQueue.length) {
      return;
    }

    if (!chaplinRadioTracks.length) {
      setChaplinRadioTracks(radioQueue);
    }

    const preferredIndex = current?.id
      ? Math.max(0, radioQueue.findIndex((item) => item.id === current.id))
      : 0;

    replaceQueue(radioQueue, preferredIndex);
    // replaceQueue is now stabilized via useCallback in PlayerContext, so it's
    // safe to depend on directly here without risking a re-render feedback loop.
  }, [radioQueue, current?.id, chaplinRadioTracks.length, setChaplinRadioTracks, replaceQueue]);


  useEffect(() => {
    const loadTracks = async () => {
      setLoadingTracks(true);
      setTracksError("");

      // Chaplin Radio's real source of truth is the curated "chaplin_radio"
      // Playlist (see backend/app/main.py) — read it directly so the global
      // station works for any visitor, not only after someone opened a
      // curator's profile in this same browser session.
      try {
        const { data: radioPlaylist } = await api.get("/playlists/chaplin-radio");
        if (radioPlaylist?.tracks?.length) {
          setChaplinRadioTracks(radioPlaylist.tracks.map((track) => ({
            id: track.id,
            src: track.media_url,
            title: track.title || "Untitled Track",
            artist: track.owner_username || "Chaplin Radio"
          })));
        }
      } catch {
        // No curated playlist yet, or the endpoint is unreachable — fall back
        // to the legacy audio-posts-derived queue below.
      }

      try {
        const { data } = await api.get("/posts/");
        setTracks((data || []).filter((p) => p.media_type === "audio"));
      } catch (error) {
        console.error(error);
        setTracksError(resolveTracksErrorMessage(error, "No se pudo cargar la lista de radio."));
      } finally {
        setLoadingTracks(false);
      }
    };

    loadTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadTracks = async () => {
    setLoadingTracks(true);
    setTracksError("");

    try {
      const { data } = await api.get("/posts/");
      setTracks((data || []).filter((p) => p.media_type === "audio"));
    } catch (error) {
      console.error(error);
      setTracksError(resolveTracksErrorMessage(error, "No se pudo refrescar la lista de radio."));
    } finally {
      setLoadingTracks(false);
    }
  };

  const openUploadPicker = () => {
    uploadInputRef.current?.click();
  };

  const onUploadAudio = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['mp3', 'wav'].includes(ext)) {
      setTracksError('Formato no soportado. Sube archivos .mp3 o .wav');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('content', file.name.replace(/\.[^.]+$/, ''));
      formData.append('is_public', 'true');
      formData.append('file', file);

      await api.post('/posts/', formData);

      await reloadTracks();
      setTracksError('Canción subida correctamente a la radio.');
    } catch (error) {
      console.error(error);
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      if (status === 401) {
        setTracksError('No autorizado para subir audio. Inicia sesión nuevamente.');
      } else if (status === 400 && detail) {
        setTracksError(`No se pudo subir la canción: ${detail}`);
      } else if (!error?.response) {
        setTracksError('No hay conexión con backend. Inicia runchaplin y vuelve a intentar.');
      } else {
        setTracksError('No se pudo subir la canción. Comprueba backend y token de sesión.');
      }
    } finally {
      setUploading(false);
    }
  };

  const startChaplinRadio = async () => {
    setActiveSource('chaplin');
    const started = await playFromSource('chaplin');

    if (started || !radioQueue.length) {
      return;
    }

    replaceQueue(radioQueue, 0);
    const first = radioQueue[0];
    await play(first.src, { ...first, queueIndex: 0, fromQueue: true });
  };

  return (
    <Wrapper className="chaplin-page-frame">
      <Container className="chaplin-page-shell">
        <RadioGrid $layoutTemplate={layoutTemplate}>
          <LeftArea>
            <SidePanel className="chaplin-theme-panel">
              <SideTitle>Controles Rapidos</SideTitle>
              <input
                ref={uploadInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={onUploadAudio}
              />
              <Button type="button" onClick={openUploadPicker} disabled={uploading}>
                {uploading ? 'Subiendo...' : '+ Anadir musica'}
              </Button>
              <Button type="button" onClick={startChaplinRadio}>
                ▶ Reproducir Radio Chaplin
              </Button>
              <Button type="button" onClick={() => setActiveTab(activeTab === 'radio' ? 'config' : 'radio')}>
                {activeTab === 'radio' ? 'Ir a Configuracion' : 'Ir a Radio'}
              </Button>
            </SidePanel>
          </LeftArea>

          <CenterArea>
            <Title>CHAPLIN RADIO</Title>

            <TabContainer className="chaplin-theme-panel">
              <Tab $active={activeTab === 'radio'} onClick={() => setActiveTab('radio')}>
                Radio
              </Tab>
              <Tab $active={activeTab === 'config'} onClick={() => setActiveTab('config')}>
                Configuración
              </Tab>
            </TabContainer>

            {activeTab === 'radio' && (
          <>
            <TrackCard className="chaplin-theme-panel">
              <TrackTitle>
                Emisora oficial de Chaplin. La selección de canciones se gestiona desde la tarjeta de perfil.
              </TrackTitle>
              <Controls>
                <Button type="button" onClick={startChaplinRadio}>
                  ▶ Reproducir Radio Chaplin
                </Button>
              </Controls>
            </TrackCard>

            {loadingTracks && (
              <TrackCard className="chaplin-theme-panel">
                <TrackTitle>Cargando canciones...</TrackTitle>
              </TrackCard>
            )}

            {!loadingTracks && tracksError && (
              <TrackCard className="chaplin-theme-panel">
                <TrackTitle>{tracksError}</TrackTitle>
              </TrackCard>
            )}

            {!loadingTracks && !tracksError && tracks.length === 0 && (
              <TrackCard className="chaplin-theme-panel">
                <TrackTitle>Aún no hay canciones publicadas en radio.</TrackTitle>
              </TrackCard>
            )}

            {tracks.map((track) => {
              const isPlaying = current?.id === track.id;

              return (
                <TrackCard className="chaplin-theme-panel" key={track.id}>
                  <TrackTitle>
                    {track.content || "Untitled Track"}
                    {isPlaying && (
                      <span style={{ marginLeft: 10, color: "#00ff88" }}>
                        ● PLAYING
                      </span>
                    )}
                  </TrackTitle>

                  <Controls>
                    <Button type="button" onClick={startChaplinRadio}>
                      ▶ Radio
                    </Button>
                  </Controls>
                </TrackCard>
              );
            })}
          </>
        )}

        {activeTab === 'config' && (
          <ConfigContainer className="chaplin-theme-panel">
            <ConfigTitle>Configuración de Radio</ConfigTitle>
            <SyncHint>
              La elección de temas, layouts y fondos vive en Configuración del Perfil → Apariencia.
              Aquí solo hay opciones propias de Radio Chaplin.
            </SyncHint>
            <RadioSubmissionsReview />
          </ConfigContainer>
        )}
          </CenterArea>

          <RightArea>
            <SidePanel className="chaplin-theme-panel">
              <SideTitle>Tema Global Activo</SideTitle>
              <TrackTitle>{appTheme.meta?.name || skinId}</TrackTitle>
              <TrackTitle>Variante: {themeVariant}</TrackTitle>
              <TrackTitle>Layout: {layoutTemplate}</TrackTitle>
              <TrackTitle>Fondo: {backgroundStyle}</TrackTitle>
            </SidePanel>
          </RightArea>
        </RadioGrid>
      </Container>
    </Wrapper>
  );
}