import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Z_INDEX } from '../styles/zIndexScale';

// Same full-screen overlay shell as Publish.jsx, kept self-contained here
// (a different page, not worth sharing styled-components across files for
// a handful of small tags). Serves BOTH the owner's editing view and a
// visitor's reading view — the backend already scopes what comes back
// (drafts only visible to the owner), so this component just renders
// whatever it received plus, when isOwner, the extra editing controls.
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
  gap: 12px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 10px;
  background: linear-gradient(180deg, rgba(6, 10, 16, 0.92), rgba(6, 10, 16, 0.4));
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

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

const CoverRow = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
`;

const Cover = styled.div`
  width: 90px;
  height: 130px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255,255,255,0.08);
  display: grid;
  place-items: center;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 14px;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 90px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 12px;
  padding: 11px;
  font-size: 14px;
`;

const PublishBtn = styled.button`
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  background: ${({ $on, theme }) => ($on ? '#3ddc84' : theme.colors.accentSoft)};
  color: ${({ $on }) => ($on ? '#06210f' : 'inherit')};
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ChapterCard = styled.div`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 12px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
`;

const ChapterHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
`;

const ChapterTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChapterActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 10px;
`;

const SmallBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 8px;
  padding: 6px 10px;
  background: transparent;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const ChapterContent = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const EmptyState = styled.p`
  text-align: center;
  opacity: 0.7;
  font-size: 13px;
  padding: 20px 10px;
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 12px;
  margin: 0;
`;

export default function BookEditor() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openChapterId, setOpenChapterId] = useState(null);

  const [savingMeta, setSavingMeta] = useState(false);
  const [newChapterOpen, setNewChapterOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [chapterBusy, setChapterBusy] = useState(false);
  const [chapterError, setChapterError] = useState('');

  const isOwner = Boolean(user && book && user.id === book.owner_id);

  const load = () => {
    setLoading(true);
    api.get(`/books/${bookId}`)
      .then(({ data }) => { setBook(data); setError(''); })
      .catch(() => setError('No se pudo encontrar este libro.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [bookId]);

  const updateBook = async (patch) => {
    setSavingMeta(true);
    try {
      const { data } = await api.put(`/books/${bookId}`, patch);
      setBook((prev) => ({ ...prev, ...data, chapters: prev.chapters }));
    } finally {
      setSavingMeta(false);
    }
  };

  const uploadCover = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/books/${bookId}/cover`, form);
    setBook((prev) => ({ ...prev, ...data, chapters: prev.chapters }));
  };

  const submitNewChapter = async (event) => {
    event.preventDefault();
    if (!newChapterTitle.trim() || !newChapterContent.trim()) {
      setChapterError('Escribe un título y contenido para el capítulo.');
      return;
    }
    setChapterBusy(true);
    setChapterError('');
    try {
      const { data: chapter } = await api.post(`/books/${bookId}/chapters`, {
        title: newChapterTitle.trim(),
        content: newChapterContent
      });
      setBook((prev) => ({ ...prev, chapters: [...prev.chapters, chapter] }));
      setNewChapterTitle('');
      setNewChapterContent('');
      setNewChapterOpen(false);
    } catch (err) {
      setChapterError(err?.response?.data?.detail || 'No se pudo añadir el capítulo.');
    } finally {
      setChapterBusy(false);
    }
  };

  const toggleChapterPublished = async (chapter) => {
    const { data } = await api.put(`/books/${bookId}/chapters/${chapter.id}`, { is_published: !chapter.is_published });
    setBook((prev) => ({ ...prev, chapters: prev.chapters.map((c) => (c.id === chapter.id ? data : c)) }));
  };

  const deleteChapter = async (chapter) => {
    if (!window.confirm(`¿Eliminar "${chapter.title}"? No se puede deshacer.`)) return;
    await api.delete(`/books/${bookId}/chapters/${chapter.id}`);
    setBook((prev) => ({ ...prev, chapters: prev.chapters.filter((c) => c.id !== chapter.id) }));
  };

  if (loading) return null;

  if (error || !book) {
    return (
      <Shell>
        <TopBar>
          <IconBtn type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /></IconBtn>
          <Title>Libro</Title>
        </TopBar>
        <Body><EmptyState>{error || 'Libro no encontrado.'}</EmptyState></Body>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar>
        <IconBtn type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /></IconBtn>
        <Title>{book.title}</Title>
      </TopBar>
      <Body>
        <CoverRow>
          <Cover>
            {book.cover_url ? <img src={book.cover_url} alt="" /> : <BookOpen size={28} opacity={0.5} />}
          </Cover>
          <div style={{ flex: 1, display: 'grid', gap: 10 }}>
            {isOwner ? (
              <>
                <div>
                  <Label>Título</Label>
                  <Input value={book.title} onChange={(e) => setBook((prev) => ({ ...prev, title: e.target.value }))} onBlur={() => updateBook({ title: book.title })} />
                </div>
                <div>
                  <Label>Portada</Label>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadCover(e.target.files[0])} />
                </div>
              </>
            ) : (
              <div>
                <Label>Autor</Label>
                <div>@{book.owner_username}</div>
                {book.genre && <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>{book.genre}</div>}
              </div>
            )}
          </div>
        </CoverRow>

        {isOwner ? (
          <>
            <div>
              <Label>Sinopsis</Label>
              <Textarea value={book.synopsis || ''} onChange={(e) => setBook((prev) => ({ ...prev, synopsis: e.target.value }))} onBlur={() => updateBook({ synopsis: book.synopsis })} />
            </div>
            <div>
              <Label>Género</Label>
              <Input value={book.genre || ''} onChange={(e) => setBook((prev) => ({ ...prev, genre: e.target.value }))} onBlur={() => updateBook({ genre: book.genre })} />
            </div>
            <PublishBtn type="button" $on={book.is_published} disabled={savingMeta} onClick={() => updateBook({ is_published: !book.is_published })}>
              {book.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
              {book.is_published ? 'Libro publicado' : 'Libro en borrador — publicar'}
            </PublishBtn>
          </>
        ) : (
          book.synopsis && <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{book.synopsis}</p>
        )}

        <div>
          <Label>Capítulos ({book.chapters.length})</Label>
          {book.chapters.length === 0 ? (
            <EmptyState>{isOwner ? 'Todavía no añadiste ningún capítulo.' : 'Sin capítulos publicados todavía.'}</EmptyState>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {book.chapters.map((chapter) => {
                const open = openChapterId === chapter.id;
                return (
                  <ChapterCard key={chapter.id}>
                    <ChapterHead onClick={() => setOpenChapterId(open ? null : chapter.id)}>
                      <ChapterTitle>
                        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {chapter.title}
                      </ChapterTitle>
                      {isOwner && !chapter.is_published && <span style={{ fontSize: 10, opacity: 0.6 }}>BORRADOR</span>}
                    </ChapterHead>
                    {open && <ChapterContent>{chapter.content}</ChapterContent>}
                    {isOwner && (
                      <ChapterActions>
                        <SmallBtn type="button" onClick={() => toggleChapterPublished(chapter)}>
                          {chapter.is_published ? <EyeOff size={12} /> : <Eye size={12} />}
                          {chapter.is_published ? 'Ocultar' : 'Publicar'}
                        </SmallBtn>
                        <SmallBtn type="button" onClick={() => deleteChapter(chapter)}>
                          <Trash2 size={12} /> Eliminar
                        </SmallBtn>
                      </ChapterActions>
                    )}
                  </ChapterCard>
                );
              })}
            </div>
          )}
        </div>

        {isOwner && (
          <div>
            {!newChapterOpen ? (
              <SmallBtn type="button" onClick={() => setNewChapterOpen(true)}>
                <Plus size={12} /> Añadir capítulo
              </SmallBtn>
            ) : (
              <form onSubmit={submitNewChapter} style={{ display: 'grid', gap: 10 }}>
                <Input placeholder="Título del capítulo" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} />
                <Textarea placeholder="Contenido del capítulo" value={newChapterContent} onChange={(e) => setNewChapterContent(e.target.value)} style={{ minHeight: 160 }} />
                {chapterError && <ErrorText>{chapterError}</ErrorText>}
                <PublishBtn type="submit" disabled={chapterBusy}>
                  {chapterBusy ? 'Guardando...' : 'Guardar capítulo (queda en borrador)'}
                </PublishBtn>
              </form>
            )}
          </div>
        )}
      </Body>
    </Shell>
  );
}
