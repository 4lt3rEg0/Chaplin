import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Camera,
  Image,
  Video,
  Music,
  BookOpen,
  Sliders,
  Eye,
  EyeOff,
  X,
  ArrowRight
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import MediaEditor from '../components/MediaEditor';
import { Z_INDEX } from '../styles/zIndexScale';

const CREATOR_MODES = ['feed', 'historia', 'reel', 'directo', 'camara'];

const Shell = styled.form`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL};
  width: 100vw;
  height: 100dvh;
  border: none;
  padding: 0;
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
  background: linear-gradient(180deg, rgba(6, 10, 16, 0.92), rgba(6, 10, 16, 0.4));
`;

const Title = styled.h2`
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
`;

const IconBtn = styled.button`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: ${({ theme }) => theme.card?.radius || '16px'};
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Stage = styled.div`
  position: relative;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 16px;
  min-height: min(58vh, 620px);
  background: radial-gradient(circle at 50% 30%, rgba(124, 190, 255, 0.14), rgba(4, 7, 12, 0.95));
  overflow: hidden;
  margin: 0 12px;
`;

const CameraPreview = styled.video`
  width: 100%;
  height: min(58vh, 620px);
  object-fit: cover;
  display: block;
`;

const MediaImg = styled.img`
  width: 100%;
  height: min(58vh, 620px);
  object-fit: contain;
  background: #05070b;
`;

const MediaVideo = styled.video`
  width: 100%;
  height: min(58vh, 620px);
  background: #05070b;
`;

const Placeholder = styled.div`
  width: 100%;
  height: min(58vh, 620px);
  display: grid;
  place-items: center;
  text-align: center;
  padding: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Tools = styled.div`
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  display: grid;
  align-content: start;
  gap: 10px;
  z-index: 3;
`;

const ToolButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text)};
  padding: 2px;
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.84)};
  display: grid;
  place-items: center;

  &:hover {
    opacity: 1;
    transform: scale(1.06);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }
`;

const ModeRail = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 6px;
  z-index: 3;
  touch-action: none;
  user-select: none;
`;

const ModeItem = styled.div`
  font-size: 9px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text)};
  opacity: ${({ $active }) => ($active ? 1 : 0.58)};
  transform: ${({ $active }) => ($active ? 'scale(1.12)' : 'scale(1)')};
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.66);
  transition: opacity 0.2s ease, transform 0.2s ease;
`;

const DiaryWidget = styled.button`
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 4;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 14px;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.06)),
    ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  padding: 8px 10px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(0deg, rgba(6, 10, 16, 0.94), rgba(6, 10, 16, 0.45));
`;

const FileInput = styled.input`
  display: block;
  width: 100%;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.text};
`;

const CancelButton = styled.button`
  margin-top: 12px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px;
  cursor: pointer;
`;

const NextButton = styled.button`
  margin-top: 12px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff9db0;
  text-align: center;
`;

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();

  const initial = location.state?.resumeDraft || null;
  const initialTypeFromQuery = new URLSearchParams(location.search).get('type')
    || (new URLSearchParams(location.search).get('mode') === 'diary' ? 'diary' : null);

  const [publishType, setPublishType] = useState(initial?.publishType || initialTypeFromQuery || 'photo');
  const [draftText, setDraftText] = useState(initial?.content || '');
  const [draftFile, setDraftFile] = useState(initial?.file || null);
  const [draftTrackId, setDraftTrackId] = useState(initial?.trackId || null);
  const [filePreview, setFilePreview] = useState(initial?.file ? URL.createObjectURL(initial.file) : '');
  const [editorOpen, setEditorOpen] = useState(false);
  const [creatorModeIndex, setCreatorModeIndex] = useState(0);
  const [toolsVisible, setToolsVisible] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [validationError, setValidationError] = useState('');
  const touchStartRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  useEffect(() => () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador no permite cámara en este modo.');
      return;
    }
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      setCameraReady(true);
      setCameraError('');
    } catch {
      setCameraReady(false);
      setCameraError('No se pudo abrir la cámara. Revisa permisos del navegador.');
    }
  };

  const switchMode = (delta) => {
    setCreatorModeIndex((prev) => {
      const total = CREATOR_MODES.length;
      return (prev + delta + total) % total;
    });
  };

  const onTouchStart = (event) => {
    touchStartRef.current = event.touches?.[0]?.clientY || null;
  };

  const onTouchEnd = (event) => {
    const start = touchStartRef.current;
    const end = event.changedTouches?.[0]?.clientY;
    touchStartRef.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 24) return;
    switchMode(delta < 0 ? 1 : -1);
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setDraftFile(nextFile);
    setValidationError('');
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(nextFile ? URL.createObjectURL(nextFile) : '');
  };

  const applyEditedFile = (editedFile, { trackId } = {}) => {
    setDraftFile(editedFile);
    setDraftTrackId(trackId || null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(editedFile));
    setEditorOpen(false);
  };

  const discardAndExit = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate('/feed');
  };

  const goToPublish = (event) => {
    event.preventDefault();
    const isDiary = publishType === 'diary';
    if (!isDiary && !draftFile) {
      setValidationError('Elige o captura un archivo antes de continuar.');
      return;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate('/publish', {
      state: {
        draft: {
          file: draftFile,
          content: draftText,
          trackId: draftTrackId,
          publishType
        }
      }
    });
  };

  return (
    <Shell onSubmit={goToPublish}>
      <TopBar>
        <Title>
          <Camera size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          editor / {CREATOR_MODES[creatorModeIndex]}
        </Title>
        <IconBtn type="button" onClick={discardAndExit} aria-label="Cerrar editor">
          <X size={14} />
        </IconBtn>
      </TopBar>

      <Stage>
        {cameraReady ? (
          <CameraPreview ref={cameraVideoRef} autoPlay muted playsInline />
        ) : filePreview ? (
          publishType === 'video' ? (
            <MediaVideo src={filePreview} controls />
          ) : publishType === 'song' ? (
            <Placeholder>
              <div>
                <Music size={28} style={{ marginBottom: 8 }} />
                <p>Audio listo para publicar</p>
              </div>
            </Placeholder>
          ) : (
            <MediaImg src={filePreview} alt="preview" />
          )
        ) : (
          <Placeholder>
            <div>
              <Camera size={28} style={{ marginBottom: 8 }} />
              <p>Abre cámara o sube un archivo para publicar.</p>
            </div>
          </Placeholder>
        )}

        {toolsVisible && (
          <Tools>
            <ToolButton type="button" $active={publishType === 'photo'} onClick={() => setPublishType('photo')}>
              <Image size={18} />
            </ToolButton>
            <ToolButton type="button" $active={publishType === 'video'} onClick={() => setPublishType('video')}>
              <Video size={18} />
            </ToolButton>
            <ToolButton type="button" $active={publishType === 'song'} onClick={() => setPublishType('song')}>
              <Music size={18} />
            </ToolButton>
            <ToolButton
              type="button"
              disabled={!draftFile || publishType === 'song'}
              onClick={() => setEditorOpen(true)}
            >
              <Sliders size={18} />
            </ToolButton>
          </Tools>
        )}

        <DiaryWidget type="button" onClick={() => setPublishType('diary')}>
          <BookOpen size={14} />
          querido diario
        </DiaryWidget>

        <ModeRail
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onWheel={(event) => {
            if (event.deltaY > 0) switchMode(1);
            if (event.deltaY < 0) switchMode(-1);
          }}
        >
          {CREATOR_MODES.map((mode, index) => (
            <ModeItem key={mode} $active={creatorModeIndex === index}>
              {mode}
            </ModeItem>
          ))}
        </ModeRail>
      </Stage>

      <Footer>
        <IconBtn type="button" onClick={startCamera}>
          <Camera size={14} />
          {cameraReady ? 'reiniciar camara' : 'abrir camara'}
        </IconBtn>

        <IconBtn type="button" onClick={() => setToolsVisible((prev) => !prev)}>
          {toolsVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          {toolsVisible ? 'ocultar iconos' : 'mostrar iconos'}
        </IconBtn>

        {(publishType === 'photo' || publishType === 'video' || publishType === 'song') ? (
          <FileInput
            type="file"
            accept={publishType === 'photo' ? 'image/*' : publishType === 'video' ? 'video/*' : 'audio/*'}
            onChange={handleFileChange}
          />
        ) : (
          <IconBtn type="button" onClick={() => setPublishType('diary')}>
            <BookOpen size={14} />
            modo diario
          </IconBtn>
        )}

        {draftTrackId && (
          <IconBtn type="button" onClick={() => setDraftTrackId(null)}>
            <Music size={14} />
            quitar cancion
          </IconBtn>
        )}

        {validationError && <ErrorText>{validationError}</ErrorText>}
        {cameraError && <ErrorText>{cameraError}</ErrorText>}

        <CancelButton type="button" onClick={discardAndExit}>
          cancelar
        </CancelButton>

        <NextButton type="submit">
          siguiente: publicar
          <ArrowRight size={14} />
        </NextButton>
      </Footer>

      {editorOpen && draftFile && (publishType === 'photo' || publishType === 'video') && (
        <MediaEditor
          file={draftFile}
          mediaType={publishType}
          initialTrackId={draftTrackId}
          onApply={applyEditedFile}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </Shell>
  );
}
