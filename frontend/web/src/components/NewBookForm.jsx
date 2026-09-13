import React, { useState } from 'react';
import styled from 'styled-components';
import { useSkin } from '../context/SkinContext';
import api from '../services/api';

// Same fields/logic as ProfileTabs.jsx's inline "Nuevo libro" form —
// extracted so the exact same creation flow can be reused both inline
// (Libros tab) and as a standalone full-screen destination (NewBook.jsx),
// without duplicating the POST /books logic in two places.
const CreateForm = styled.form`
  border: 1px dashed ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FormInput = styled.input`
  border: 1px solid ${({ $borderColor }) => $borderColor};
  background: rgba(0, 0, 0, 0.3);
  color: inherit;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
`;

const FormTextarea = styled.textarea`
  border: 1px solid ${({ $borderColor }) => $borderColor};
  background: rgba(0, 0, 0, 0.3);
  color: inherit;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  resize: vertical;
`;

const SubmitBtn = styled.button`
  border: 1px solid ${({ $accentColor }) => $accentColor};
  background: transparent;
  color: ${({ $accentColor }) => $accentColor};
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormError = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff6b6b;
`;

export default function NewBookForm({ onSuccess }) {
  const { skinData, appTheme } = useSkin();
  const accentColor = skinData?.accent || '#ff00ff';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.12)';

  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genre, setGenre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Escribe un título para tu libro.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: newBook } = await api.post('/books', {
        title: title.trim(),
        synopsis: synopsis.trim() || null,
        genre: genre.trim() || null
      });
      setTitle('');
      setSynopsis('');
      setGenre('');
      onSuccess?.(newBook);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo crear el libro. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <CreateForm onSubmit={submit} $borderColor={borderColor}>
      <FormInput
        type="text"
        placeholder="Título del libro"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        $borderColor={borderColor}
        disabled={busy}
      />
      <FormTextarea
        rows={2}
        placeholder="Sinopsis (opcional)"
        value={synopsis}
        onChange={(e) => setSynopsis(e.target.value)}
        $borderColor={borderColor}
        disabled={busy}
      />
      <FormInput
        type="text"
        placeholder="Género (opcional)"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        $borderColor={borderColor}
        disabled={busy}
      />
      {error && <FormError>{error}</FormError>}
      <SubmitBtn type="submit" $accentColor={accentColor} disabled={busy}>
        {busy ? 'Creando...' : 'Crear libro (empieza en borrador)'}
      </SubmitBtn>
    </CreateForm>
  );
}
