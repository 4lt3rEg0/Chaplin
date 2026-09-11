import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Plus } from 'lucide-react';
import api from '../services/api';

// Same plain-page layout convention as Explore.jsx (this is a primary
// navigable page, not a transient editor overlay like BookEditor.jsx).
const Wrapper = styled.div`
  background: ${({ theme }) => theme.gradients.page};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100dvh;
  padding-top: calc(var(--chaplin-player-panel-offset, 0px) + 52px);
  padding-bottom: calc(var(--chaplin-mobile-dock-offset, 0px) + 16px);
`;

const Shell = styled.div`
  max-width: min(var(--chaplin-shell-max, 640px), 100%);
  margin: 0 auto;
  padding: 0 14px 20px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
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

const HeaderTitle = styled.h1`
  font-size: 16px;
  margin: 0;
  flex: 1;
`;

const NewThreadBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const CategoryRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 14px;
`;

const CategoryChip = styled.button`
  flex-shrink: 0;
  border: 1px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
`;

const ThreadCard = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  color: inherit;
`;

const ThreadTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
`;

const ThreadMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  opacity: 0.7;
  margin-top: 8px;
`;

const CategoryBadge = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
`;

const StatusText = styled.p`
  text-align: center;
  opacity: 0.7;
  font-size: 13px;
  padding: 30px 10px;
`;

const NewThreadForm = styled.form`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  display: grid;
  gap: 10px;
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 14px;
`;

const Textarea = styled.textarea`
  min-height: 90px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 12px;
  padding: 11px;
  font-size: 14px;
`;

const Select = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 14px;
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 12px;
  margin: 0;
`;

const SubmitBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export default function Forum() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/forum/categories').then(({ data }) => {
      setCategories(data);
      setNewCategory(data[0] || '');
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/forum/threads', { params: activeCategory ? { category: activeCategory } : {} })
      .then(({ data }) => setThreads(data))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const submitNewThread = async (event) => {
    event.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setError('Escribe un título y contenido para el hilo.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: thread } = await api.post('/forum/threads', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory
      });
      navigate(`/forum/threads/${thread.id}`);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo crear el hilo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrapper>
      <Shell>
        <HeaderRow>
          <BackButton type="button" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft size={16} />
          </BackButton>
          <HeaderTitle>Foro</HeaderTitle>
          <NewThreadBtn type="button" onClick={() => setNewOpen((prev) => !prev)}>
            <Plus size={14} /> {newOpen ? 'Cerrar' : 'Nuevo hilo'}
          </NewThreadBtn>
        </HeaderRow>

        {newOpen && (
          <NewThreadForm onSubmit={submitNewThread}>
            <Input placeholder="Título del hilo" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Textarea placeholder="¿De qué quieres hablar?" value={newContent} onChange={(e) => setNewContent(e.target.value)} />
            <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {error && <ErrorText>{error}</ErrorText>}
            <SubmitBtn type="submit" disabled={busy}>{busy ? 'Creando...' : 'Publicar hilo'}</SubmitBtn>
          </NewThreadForm>
        )}

        <CategoryRow>
          <CategoryChip type="button" $active={activeCategory === null} onClick={() => setActiveCategory(null)}>
            Todas
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip key={c} type="button" $active={activeCategory === c} onClick={() => setActiveCategory(c)}>
              {c}
            </CategoryChip>
          ))}
        </CategoryRow>

        {loading ? (
          <StatusText>Cargando...</StatusText>
        ) : threads.length === 0 ? (
          <StatusText>Todavía no hay hilos {activeCategory ? `en ${activeCategory}` : ''}. ¡Abre el primero!</StatusText>
        ) : (
          threads.map((thread) => (
            <ThreadCard key={thread.id} type="button" onClick={() => navigate(`/forum/threads/${thread.id}`)}>
              <ThreadTitle>{thread.title}</ThreadTitle>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{thread.content.slice(0, 140)}{thread.content.length > 140 ? '…' : ''}</div>
              <ThreadMeta>
                <CategoryBadge>{thread.category}</CategoryBadge>
                <span>@{thread.owner_username}</span>
                <span><MessageCircle size={12} style={{ verticalAlign: 'middle' }} /> {thread.reply_count}</span>
                <span><Heart size={12} style={{ verticalAlign: 'middle' }} fill={thread.liked_by_me ? 'currentColor' : 'none'} /> {thread.like_count}</span>
              </ThreadMeta>
            </ThreadCard>
          ))
        )}
      </Shell>
    </Wrapper>
  );
}
