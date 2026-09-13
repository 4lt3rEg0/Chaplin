import React, { useState } from 'react';
import styled from 'styled-components';
import { Radio } from 'lucide-react';
import { useSkin } from '../context/SkinContext';
import api from '../services/api';

// Same fields/logic as ProfileTabs.jsx's inline "Subir canción" form —
// extracted so the exact same upload flow can be reused both inline
// (Música tab) and as a standalone full-screen destination (CreateTrack.jsx),
// without duplicating the POST /tracks/upload logic in two places.
const UploadForm = styled.form`
  border: 1px dashed ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const UploadInput = styled.input`
  border: 1px solid ${({ $borderColor }) => $borderColor};
  background: rgba(0, 0, 0, 0.3);
  color: inherit;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
`;

const UploadCheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`;

const UploadSubmitBtn = styled.button`
  border: 1px solid ${({ $accentColor }) => $accentColor};
  background: ${({ $accentColor }) => $accentColor};
  color: #05070b;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const UploadError = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff6b6b;
`;

const HintPill = styled.span`
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
`;

export default function TrackUploadForm({ onSuccess }) {
  const { skinData, appTheme } = useSkin();
  const accentColor = skinData?.accent || '#ff00ff';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.12)';

  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [artwork, setArtwork] = useState(null);
  const [toRadio, setToRadio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!file || !title.trim()) {
      setError('Elige un archivo de audio y escribe un título.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title.trim());
      form.append('target', toRadio ? 'radio' : 'personal');
      if (artwork) form.append('artwork', artwork);
      const { data: newTrack } = await api.post('/tracks/upload', form, { timeout: 60000 });
      setTitle('');
      setFile(null);
      setArtwork(null);
      setToRadio(false);
      onSuccess?.(newTrack);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo subir la canción. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <UploadForm onSubmit={submit} $borderColor={borderColor}>
      <UploadInput
        type="text"
        placeholder="Título de la canción"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        $borderColor={borderColor}
        disabled={busy}
      />
      <UploadInput
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        $borderColor={borderColor}
        disabled={busy}
      />
      <div>
        <HintPill>Portada (opcional)</HintPill>
      </div>
      <UploadInput
        type="file"
        accept="image/*"
        onChange={(e) => setArtwork(e.target.files?.[0] || null)}
        $borderColor={borderColor}
        disabled={busy}
      />
      <UploadCheckRow>
        <input
          type="checkbox"
          checked={toRadio}
          onChange={(e) => setToRadio(e.target.checked)}
          disabled={busy}
        />
        <Radio size={14} />
        Enviar también a Radio Chaplin (queda pendiente de revisión)
      </UploadCheckRow>
      {error && <UploadError>{error}</UploadError>}
      <UploadSubmitBtn type="submit" $accentColor={accentColor} disabled={busy}>
        {busy ? 'Subiendo...' : 'Publicar canción'}
      </UploadSubmitBtn>
    </UploadForm>
  );
}
