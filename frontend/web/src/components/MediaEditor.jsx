import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, FlipHorizontal, Music, Pause, Play, RotateCcw, RotateCw, X } from 'lucide-react';
import { Z_INDEX } from '../styles/zIndexScale';
import { FILTER_PRESETS, getPreset } from './filterPresets';
import api from '../services/api';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MEDIA_EDITOR};
  background: rgba(4, 6, 10, 0.96);
  color: #fff;
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: minmax(0, 1fr);
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 10px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.85;
`;

const IconBtn = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Body = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
`;

const Stage = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 12px;
  min-height: 0;
`;

const PhotoPreview = styled.img`
  max-width: 100%;
  max-height: 100%;
  transform: ${({ $rotation, $flipH }) => `rotate(${$rotation}deg) scaleX(${$flipH ? -1 : 1})`};
  filter: ${({ $filterCss }) => $filterCss};
  transition: transform 0.15s ease;
`;

const VideoPreview = styled.video`
  max-width: 100%;
  max-height: 100%;
  filter: ${({ $filterCss }) => $filterCss};
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 10px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button`
  border: none;
  background: none;
  color: ${({ $active }) => ($active ? '#fff' : 'rgba(255,255,255,0.55)')};
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? (theme.colors.accentSoft || '#3457ff') : 'transparent')};
`;

const TabContent = styled.div`
  padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(0deg, rgba(6, 10, 16, 0.96), rgba(6, 10, 16, 0.5));
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 46vh;
  overflow-y: auto;
`;

const RowLabel = styled.label`
  display: grid;
  grid-template-columns: 78px 1fr 34px;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.85;
`;

const Range = styled.input`
  width: 100%;
`;

const ToolRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const TrimRow = styled.div`
  display: grid;
  gap: 4px;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  background: rgba(6, 10, 16, 0.98);
`;

const CancelButton = styled.button`
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: #fff;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
`;

const ApplyButton = styled.button`
  flex: 2;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: ${({ theme }) => theme.colors.accentSoft || '#3457ff'};
  color: #fff;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff9db0;
  text-align: center;
`;

const PresetStrip = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const PresetItem = styled.button`
  border: 2px solid ${({ $active, theme }) => ($active ? (theme.colors.accentSoft || '#3457ff') : 'transparent')};
  background: none;
  padding: 0;
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
  display: grid;
  gap: 4px;
  justify-items: center;
`;

const PresetThumb = styled.img`
  width: 62px;
  height: 62px;
  object-fit: cover;
  border-radius: 8px;
  filter: ${({ $tone }) => $tone || 'none'};
  background: #111;
`;

const PresetLabel = styled.span`
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.75);
`;

const TrackRow = styled.button`
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $active, theme }) => ($active ? (theme.colors.accentSoft || '#3457ff') : 'rgba(255,255,255,0.15)')};
  background: ${({ $active }) => ($active ? 'rgba(52,87,255,0.15)' : 'rgba(255,255,255,0.04)')};
  border-radius: 10px;
  padding: 8px 10px;
  color: #fff;
  cursor: pointer;
  text-align: left;
`;

const TrackTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NoTracksText = styled.p`
  font-size: 12px;
  opacity: 0.7;
  text-align: center;
  margin: 10px 0;
`;

const formatTime = (seconds) => {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const composeFilter = (tone, brightness, contrast, saturate) =>
  [tone, `brightness(${brightness}%)`, `contrast(${contrast}%)`, `saturate(${saturate}%)`].filter(Boolean).join(' ');

async function bakePhotoEdit(file, { rotation, flipH, brightness, contrast, saturate, tone }) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen'));
      el.src = objectUrl;
    });

    const swap = rotation === 90 || rotation === 270;
    const canvas = document.createElement('canvas');
    canvas.width = swap ? img.naturalHeight : img.naturalWidth;
    canvas.height = swap ? img.naturalWidth : img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.filter = composeFilter(tone, brightness, contrast, saturate);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.92);
    });

    const baseName = file.name.replace(/\.[^./]+$/, '') || 'foto';
    return new File([blob], `${baseName}-editado.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function bakeVideoEdit(videoEl, file, { trimStart, trimEnd, brightness, contrast, saturate, tone }, onProgress) {
  if (typeof MediaRecorder === 'undefined' || !videoEl.captureStream) {
    throw new Error('Este dispositivo no soporta editar video en el navegador.');
  }
  if (!(trimEnd - trimStart > 0.15)) {
    throw new Error('El rango de recorte es demasiado corto.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 360;
  const ctx = canvas.getContext('2d');

  const canvasStream = canvas.captureStream(30);
  let combinedStream = canvasStream;
  try {
    const sourceStream = videoEl.captureStream();
    const audioTracks = sourceStream.getAudioTracks();
    if (audioTracks.length > 0) {
      combinedStream = new MediaStream([...canvasStream.getVideoTracks(), audioTracks[0]]);
    }
  } catch {
    // Continue video-only if this browser can't tap the decoded audio track.
  }

  const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = resolve;
    recorder.onerror = (event) => reject(event.error || new Error('Fallo al grabar el video editado'));
  });

  await new Promise((resolve) => {
    const onSeeked = () => {
      videoEl.removeEventListener('seeked', onSeeked);
      resolve();
    };
    videoEl.addEventListener('seeked', onSeeked);
    videoEl.currentTime = trimStart;
  });

  recorder.start(250);
  await videoEl.play();

  // setInterval instead of requestAnimationFrame: rAF is throttled/paused by
  // the browser whenever the tab or WebView loses visibility (screen lock,
  // app switch), which would hang an in-progress export indefinitely.
  await new Promise((resolve) => {
    const tick = () => {
      if (videoEl.currentTime >= trimEnd || videoEl.ended) {
        window.clearInterval(intervalId);
        resolve();
        return;
      }
      ctx.filter = composeFilter(tone, brightness, contrast, saturate);
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      if (onProgress) {
        onProgress(Math.min(1, (videoEl.currentTime - trimStart) / Math.max(0.01, trimEnd - trimStart)));
      }
    };
    const intervalId = window.setInterval(tick, 33);
    tick();
  });

  videoEl.pause();
  recorder.stop();
  await stopped;

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (blob.size === 0) {
    throw new Error('La edición no generó un video válido.');
  }

  const baseName = file.name.replace(/\.[^./]+$/, '') || 'video';
  return new File([blob], `${baseName}-editado.webm`, { type: 'video/webm' });
}

export default function MediaEditor({ file, mediaType, initialTrackId, onApply, onClose }) {
  const isVideo = mediaType === 'video';
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const videoRef = useRef(null);
  const previewAudioRef = useRef(null);

  const [activeTab, setActiveTab] = useState('filtros');
  const [presetId, setPresetId] = useState('original');
  const [posterUrl, setPosterUrl] = useState('');

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);

  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [tracks, setTracks] = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId || null);
  const [previewingTrackId, setPreviewingTrackId] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const tone = getPreset(presetId).tone;
  const filterCss = composeFilter(tone, brightness, contrast, saturate);

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);
  useEffect(() => () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'musica' || tracksLoaded || tracksLoading) return;
    setTracksLoading(true);
    api.get('/tracks/mine')
      .then(({ data }) => setTracks(data))
      .catch(() => setTracks([]))
      .finally(() => {
        setTracksLoading(false);
        setTracksLoaded(true);
      });
  }, [activeTab, tracksLoaded, tracksLoading]);

  const capturePoster = () => {
    const el = videoRef.current;
    if (!el || !el.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = el.videoWidth;
    c.height = el.videoHeight;
    c.getContext('2d').drawImage(el, 0, 0);
    setPosterUrl(c.toDataURL('image/jpeg', 0.6));
  };

  const handleVideoMeta = () => {
    const el = videoRef.current;
    if (!el) return;

    if (!Number.isFinite(el.duration)) {
      // Some containers (notably webm without proper cues) report Infinity
      // until the browser is forced to compute the real duration this way.
      const onDurationChange = () => {
        el.removeEventListener('durationchange', onDurationChange);
        el.currentTime = 0;
        if (Number.isFinite(el.duration) && el.duration > 0) {
          setDuration(el.duration);
          setTrimStart(0);
          setTrimEnd(el.duration);
        } else {
          setError('No se pudo leer la duración de este video.');
        }
      };
      el.addEventListener('durationchange', onDurationChange);
      el.currentTime = Number.MAX_SAFE_INTEGER;
      return;
    }

    setDuration(el.duration);
    setTrimStart(0);
    setTrimEnd(el.duration);
  };

  const previewTrim = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = trimStart;
    el.play();
    const onTime = () => {
      if (el.currentTime >= trimEnd) {
        el.pause();
        el.removeEventListener('timeupdate', onTime);
      }
    };
    el.addEventListener('timeupdate', onTime);
  };

  const reset = () => {
    setPresetId('original');
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
  };

  const toggleTrackPreview = (track) => {
    const audioEl = previewAudioRef.current;
    if (!audioEl) return;
    if (previewingTrackId === track.id) {
      audioEl.pause();
      setPreviewingTrackId(null);
      return;
    }
    audioEl.src = track.media_url;
    audioEl.play();
    setPreviewingTrackId(track.id);
  };

  const apply = async () => {
    setError('');
    setProcessing(true);
    try {
      let edited;
      if (isVideo) {
        const el = videoRef.current;
        el.pause();
        edited = await bakeVideoEdit(el, file, { trimStart, trimEnd, brightness, contrast, saturate, tone }, setProgress);
      } else {
        edited = await bakePhotoEdit(file, { rotation, flipH, brightness, contrast, saturate, tone });
      }
      onApply(edited, { trackId: selectedTrackId });
    } catch (err) {
      setError(err.message || 'No se pudo aplicar la edición.');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const tabs = isVideo ? ['filtros', 'recorte', 'ajustes', 'musica'] : ['filtros', 'ajustes', 'musica'];
  const tabLabels = { filtros: 'Filtros', recorte: 'Recorte', ajustes: 'Ajustes', musica: 'Música' };
  const thumbSrc = isVideo ? posterUrl : objectUrl;

  return (
    <Overlay>
      <TopBar>
        <Title>{isVideo ? 'editar video' : 'editar foto'}</Title>
        <IconBtn type="button" onClick={onClose} disabled={processing} aria-label="Cerrar editor">
          <X size={16} />
        </IconBtn>
      </TopBar>

      <Body>
        <Stage>
          {isVideo ? (
            <VideoPreview
              ref={videoRef}
              src={objectUrl}
              onLoadedMetadata={handleVideoMeta}
              onLoadedData={capturePoster}
              playsInline
              muted={false}
              $filterCss={filterCss}
            />
          ) : (
            <PhotoPreview
              src={objectUrl}
              alt="editando"
              $rotation={rotation}
              $flipH={flipH}
              $filterCss={filterCss}
            />
          )}
        </Stage>

        <div>
          <TabBar>
            {tabs.map((tabId) => (
              <TabButton key={tabId} type="button" $active={activeTab === tabId} onClick={() => setActiveTab(tabId)}>
                {tabLabels[tabId]}
              </TabButton>
            ))}
          </TabBar>

          <TabContent>
            {error && <ErrorText>{error}</ErrorText>}
            {processing && isVideo && <ErrorText style={{ color: '#7cf0ff' }}>Procesando video... {Math.round(progress * 100)}%</ErrorText>}

            {activeTab === 'filtros' && (
              <PresetStrip>
                {FILTER_PRESETS.map((preset) => (
                  <PresetItem key={preset.id} type="button" $active={presetId === preset.id} onClick={() => setPresetId(preset.id)}>
                    {thumbSrc ? (
                      <PresetThumb src={thumbSrc} alt={preset.name} $tone={preset.tone} />
                    ) : (
                      <PresetThumb as="div" $tone={preset.tone} />
                    )}
                    <PresetLabel>{preset.name}</PresetLabel>
                  </PresetItem>
                ))}
              </PresetStrip>
            )}

            {activeTab === 'recorte' && isVideo && duration > 0 && (
              <TrimRow>
                <RowLabel>
                  inicio
                  <Range
                    type="range"
                    min={0}
                    max={Math.max(0, trimEnd - 0.2)}
                    step={0.1}
                    value={trimStart}
                    disabled={processing}
                    onChange={(event) => setTrimStart(Number(event.target.value))}
                  />
                  {formatTime(trimStart)}
                </RowLabel>
                <RowLabel>
                  final
                  <Range
                    type="range"
                    min={Math.min(duration, trimStart + 0.2)}
                    max={duration}
                    step={0.1}
                    value={trimEnd}
                    disabled={processing}
                    onChange={(event) => setTrimEnd(Number(event.target.value))}
                  />
                  {formatTime(trimEnd)}
                </RowLabel>
                <IconBtn type="button" onClick={previewTrim} disabled={processing} style={{ justifySelf: 'center', width: 'auto', padding: '0 14px' }}>
                  probar recorte
                </IconBtn>
              </TrimRow>
            )}

            {activeTab === 'ajustes' && (
              <>
                {!isVideo && (
                  <ToolRow>
                    <IconBtn type="button" onClick={() => setRotation((r) => (r + 270) % 360)} disabled={processing} aria-label="Rotar izquierda">
                      <RotateCcw size={16} />
                    </IconBtn>
                    <IconBtn type="button" onClick={() => setRotation((r) => (r + 90) % 360)} disabled={processing} aria-label="Rotar derecha">
                      <RotateCw size={16} />
                    </IconBtn>
                    <IconBtn type="button" onClick={() => setFlipH((f) => !f)} disabled={processing} aria-label="Voltear horizontal">
                      <FlipHorizontal size={16} />
                    </IconBtn>
                  </ToolRow>
                )}
                <RowLabel>
                  brillo
                  <Range type="range" min={50} max={150} value={brightness} disabled={processing} onChange={(e) => setBrightness(Number(e.target.value))} />
                  {brightness}%
                </RowLabel>
                <RowLabel>
                  contraste
                  <Range type="range" min={50} max={150} value={contrast} disabled={processing} onChange={(e) => setContrast(Number(e.target.value))} />
                  {contrast}%
                </RowLabel>
                <RowLabel>
                  saturación
                  <Range type="range" min={0} max={200} value={saturate} disabled={processing} onChange={(e) => setSaturate(Number(e.target.value))} />
                  {saturate}%
                </RowLabel>
              </>
            )}

            {activeTab === 'musica' && (
              <>
                {tracksLoading && <NoTracksText>Cargando tus canciones...</NoTracksText>}
                {!tracksLoading && tracksLoaded && tracks.length === 0 && (
                  <NoTracksText>No tienes canciones subidas todavía. Sube una desde tu perfil para poder acompañar tus posts.</NoTracksText>
                )}
                {selectedTrackId && (
                  <TrackRow type="button" $active onClick={() => setSelectedTrackId(null)}>
                    <Music size={16} />
                    <TrackTitle>Quitar canción seleccionada</TrackTitle>
                    <X size={14} />
                  </TrackRow>
                )}
                {tracks.map((track) => (
                  <TrackRow key={track.id} type="button" $active={selectedTrackId === track.id} onClick={() => setSelectedTrackId(track.id)}>
                    <IconBtn
                      type="button"
                      as="span"
                      style={{ width: 28, height: 28 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTrackPreview(track);
                      }}
                    >
                      {previewingTrackId === track.id ? <Pause size={12} /> : <Play size={12} />}
                    </IconBtn>
                    <TrackTitle>{track.title}</TrackTitle>
                    {selectedTrackId === track.id && <Check size={14} />}
                  </TrackRow>
                ))}
                <audio ref={previewAudioRef} onEnded={() => setPreviewingTrackId(null)} style={{ display: 'none' }} />
              </>
            )}
          </TabContent>
        </div>
      </Body>

      <ActionsRow>
        <CancelButton type="button" onClick={reset} disabled={processing}>
          restablecer
        </CancelButton>
        <ApplyButton type="button" onClick={apply} disabled={processing}>
          <Check size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {processing ? 'aplicando...' : 'aplicar'}
        </ApplyButton>
      </ActionsRow>
    </Overlay>
  );
}
