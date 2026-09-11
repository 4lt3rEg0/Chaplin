import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const CategoryBadge = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
`;

const ThreadCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
`;

const ThreadTitle = styled.h2`
  font-size: 17px;
  margin: 8px 0 6px;
`;

const ThreadContent = styled.p`
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0 0 12px;
`;

const ThreadFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LikeBtn = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ $liked, theme }) => ($liked ? (theme.colors.primary || '#ff4fd8') : theme.colors.text)};
`;

const DeleteBtn = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: #ff6b6b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
`;

const RepliesTitle = styled.h3`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
  margin: 0 0 10px;
`;

const ReplyCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
`;

const ReplyMeta = styled.div`
  font-size: 11px;
  opacity: 0.6;
  margin-bottom: 4px;
`;

const ReplyContent = styled.p`
  font-size: 13px;
  margin: 0;
  white-space: pre-wrap;
`;

const ReplyForm = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ReplyInput = styled.textarea`
  flex: 1;
  min-height: 44px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 13px;
`;

const SendBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const StatusText = styled.p`
  text-align: center;
  opacity: 0.7;
  font-size: 13px;
  padding: 20px 10px;
`;

export default function ThreadDetail() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/forum/threads/${threadId}`),
      api.get(`/forum/threads/${threadId}/replies`)
    ])
      .then(([threadRes, repliesRes]) => {
        setThread(threadRes.data);
        setReplies(repliesRes.data);
      })
      .catch(() => setThread(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [threadId]);

  const toggleLike = async () => {
    const { data } = await api.post(`/forum/threads/${threadId}/like`);
    setThread(data);
  };

  const deleteThread = async () => {
    if (!window.confirm('¿Eliminar este hilo? No se puede deshacer.')) return;
    await api.delete(`/forum/threads/${threadId}`);
    navigate('/forum');
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (!replyText.trim()) return;
    setReplyBusy(true);
    try {
      const { data } = await api.post(`/forum/threads/${threadId}/replies`, { content: replyText.trim() });
      setReplies((prev) => [...prev, data]);
      setReplyText('');
      setThread((prev) => (prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev));
    } finally {
      setReplyBusy(false);
    }
  };

  if (loading) return null;

  if (!thread) {
    return (
      <Wrapper><Shell>
        <HeaderRow>
          <BackButton type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /></BackButton>
        </HeaderRow>
        <StatusText>Hilo no encontrado.</StatusText>
      </Shell></Wrapper>
    );
  }

  const isOwner = Boolean(user && user.id === thread.owner_id);

  return (
    <Wrapper>
      <Shell>
        <HeaderRow>
          <BackButton type="button" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={16} /></BackButton>
        </HeaderRow>

        <ThreadCard>
          <CategoryBadge>{thread.category}</CategoryBadge>
          <ThreadTitle>{thread.title}</ThreadTitle>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>@{thread.owner_username}</div>
          <ThreadContent>{thread.content}</ThreadContent>
          <ThreadFooter>
            <LikeBtn type="button" $liked={thread.liked_by_me} onClick={toggleLike}>
              <Heart size={16} fill={thread.liked_by_me ? 'currentColor' : 'none'} /> {thread.like_count}
            </LikeBtn>
            {isOwner && (
              <DeleteBtn type="button" onClick={deleteThread}>
                <Trash2 size={14} /> Eliminar
              </DeleteBtn>
            )}
          </ThreadFooter>
        </ThreadCard>

        <RepliesTitle>Respuestas ({replies.length})</RepliesTitle>
        {replies.length === 0 ? (
          <StatusText>Sé el primero en responder.</StatusText>
        ) : (
          replies.map((reply) => (
            <ReplyCard key={reply.id}>
              <ReplyMeta>@{reply.owner_username}</ReplyMeta>
              <ReplyContent>{reply.content}</ReplyContent>
            </ReplyCard>
          ))
        )}

        <ReplyForm onSubmit={submitReply}>
          <ReplyInput placeholder="Escribe una respuesta..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
          <SendBtn type="submit" disabled={replyBusy}>Enviar</SendBtn>
        </ReplyForm>
      </Shell>
    </Wrapper>
  );
}
