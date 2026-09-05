import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Music, RefreshCw, X } from 'lucide-react';
import api from '../services/api';
import { Z_INDEX } from '../styles/zIndexScale';

const Shell = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 10px;
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
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 12px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Body = styled.div`
  overflow-y: auto;
  padding: 16px;
  display: grid;
  gap: 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
`;

const PreviewBox = styled.div`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 16px;
  overflow: hidden;
  background: #05070b;
  display: grid;
  place-items: center;
  min-height: 220px;

  img, video {
    width: 100%;
    max-height: 420px;
    object-fit: contain;
    display: block;
  }
`;

const AudioBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text};
  padding: 30px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 110px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 12px;
  padding: 11px;
  font-size: 14px;
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
`;

const TrackChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
  width: fit-content;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 10px;
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px));
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
`;

const BackButton = styled.button`
  flex: 1;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PublishBtn = styled.button`
  flex: 2;
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
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorBanner = styled.div`
  border: 1px solid #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  color: #ff9db0;
  border-radius: 12px;
  padding: 12px;
  font-size: 13px;
`;

const ConfirmWrap = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  text-align: center;
  gap: 16px;
  padding: 20px;
`;

const ConfirmIcon = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(61, 220, 132, 0.15);
  color: #3ddc84;
  display: grid;
  place-items: center;
`;

const ConfirmTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
`;

const spin = { animation: 'chaplin-spin 1s linear infinite' };

export default function Publish() {
  const navigate = useNavigate();
  const location = useLocation();
  const draft = location.state?.draft || null;

  const [content, setContent] = useState(draft?.content || '');
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | validating | publishing | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [publishedPost, setPublishedPost] = useState(null);

  const previewUrl = useMemo(() => (draft?.file ? URL.createObjectURL(draft.file) : ''), [draft?.file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!draft) {
      navigate('/editor', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) {
    return null;
  }

  const isDiary = draft.publishType === 'diary';

  const backToEditor = () => {
    navigate('/editor', {
      state: {
        resumeDraft: {
          file: draft.file,
          content,
          trackId: draft.trackId,
          publishType: draft.publishType
        }
      }
    });
  };

  const publish = async () => {
    if (status === 'validating' || status === 'publishing') return;

    setStatus('validating');
    setErrorMessage('');

    const finalContent = isDiary ? (content.trim() || 'Entrada de diario') : content;
    if (!isDiary && !draft.file) {
      setStatus('error');
      setErrorMessage('Falta el archivo a publicar. Vuelve al editor.');
      return;
    }

    setStatus('publishing');
    const formData = new FormData();
    formData.append('content', finalContent);
    formData.append('is_public', String(isPublic));
    if (draft.file) formData.append('file', draft.file);
    if (draft.trackId) formData.append('track_id', String(draft.trackId));

    try {
      const { data } = await api.post('/posts/', formData, { timeout: 60000 });
      setPublishedPost(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err?.response?.data?.detail || 'No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.'
      );
    }
  };

  if (status === 'success') {
    return (
      <Shell>
        <ConfirmWrap>
          <ConfirmIcon>
            <Check size={36} />
          </ConfirmIcon>
          <ConfirmTitle>Publicado</ConfirmTitle>
          <p style={{ opacity: 0.75, margin: 0 }}>Tu contenido ya está visible en el feed.</p>
          <ConfirmActions>
            <BackButton type="button" onClick={() => navigate('/editor')}>
              Publicar otra cosa
            </BackButton>
            <PublishBtn type="button" onClick={() => navigate('/feed')}>
              Ver en el feed
            </PublishBtn>
          </ConfirmActions>
        </ConfirmWrap>
      </Shell>
    );
  }

  const busy = status === 'validating' || status === 'publishing';

  return (
    <Shell>
      <style>{'@keyframes chaplin-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <TopBar>
        <Title>publicar</Title>
        <IconBtn type="button" onClick={backToEditor} disabled={busy} aria-label="Cerrar">
          <X size={14} />
        </IconBtn>
      </TopBar>

      <Body>
        <PreviewBox>
          {draft.publishType === 'video' && previewUrl && <video src={previewUrl} controls />}
          {draft.publishType === 'photo' && previewUrl && <img src={previewUrl} alt="preview" />}
          {draft.publishType === 'song' && (
            <AudioBadge>
              <Music size={20} />
              {draft.file?.name || 'Audio listo'}
            </AudioBadge>
          )}
          {isDiary && (
            <AudioBadge>
              Entrada de diario
            </AudioBadge>
          )}
        </PreviewBox>

        {draft.trackId && (
          <TrackChip>
            <Music size={13} />
            Canción adjunta
          </TrackChip>
        )}

        <div>
          <Label>{isDiary ? 'Tu entrada' : 'Descripción'}</Label>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={isDiary ? 'Querido diario...' : 'Escribe algo sobre esta publicación...'}
            disabled={busy}
          />
        </div>

        <CheckRow>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            disabled={busy}
          />
          Publicación visible para todos (desmarca para dejarla privada)
        </CheckRow>

        {status === 'error' && <ErrorBanner>{errorMessage}</ErrorBanner>}

        <ActionsRow>
          <BackButton type="button" onClick={backToEditor} disabled={busy}>
            <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            volver al editor
          </BackButton>
          <PublishBtn type="button" onClick={publish} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={14} style={spin} />
                {status === 'validating' ? 'validando...' : 'publicando...'}
              </>
            ) : status === 'error' ? (
              <>
                <RefreshCw size={14} />
                reintentar
              </>
            ) : (
              <>
                <Check size={14} />
                confirmar publicación
              </>
            )}
          </PublishBtn>
        </ActionsRow>
      </Body>
    </Shell>
  );
}
