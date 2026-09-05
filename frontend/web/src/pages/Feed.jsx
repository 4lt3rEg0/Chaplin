import React, { useMemo, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  MessageCircle,
  Send,
  PlusSquare,
  Video,
  Music,
  BookOpen,
  Play,
  Pause
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSkin } from '../context/SkinContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Shell = styled.div`
  max-width: min(var(--chaplin-shell-max, 1220px), 100%);
  margin: 0 auto;
  position: relative;
`;

const FeedGrid = styled.div`
  display: grid;
  grid-template-areas: "left center right";
  grid-template-columns: ${({ $layoutTemplate }) => {
    if ($layoutTemplate === 'studio') return '220px minmax(0, 720px) 240px';
    if ($layoutTemplate === 'terminal') return '200px minmax(0, 760px) 200px';
    if ($layoutTemplate === 'edge') return '180px minmax(0, 780px) 180px';
    if ($layoutTemplate === 'collector' || $layoutTemplate === 'arcade') return '210px minmax(0, 740px) 210px';
    return 'minmax(0, 820px)';
  }};
  gap: var(--layout-gap, 22px);
  justify-content: center;
  align-items: start;

  ${({ $layoutTemplate }) => !['studio','terminal','edge','collector','arcade'].includes($layoutTemplate) && `
    grid-template-areas: "center";
  `}

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    grid-template-areas: ${({ $layoutTemplate }) => ['edge','studio','collector','arcade'].includes($layoutTemplate) ? '"right" "center"' : '"center"'};
  }
`;

const FeedLeftRail = styled.aside`
  grid-area: left;
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
  position: sticky;
  top: 130px;

  @media (max-width: 1100px) { display: none; }
`;

const FeedCenter = styled.main`
  grid-area: center;
  display: block;
  min-width: 0;
`;

const FeedRightRail = styled.aside`
  grid-area: right;
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
  position: sticky;
  top: 130px;

  @media (max-width: 1100px) {
    display: ${({ $mobileVisible }) => $mobileVisible ? 'block' : 'none'};
    position: static;

    > section { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }

  @media (max-width: 560px) {
    > section { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
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

const TopBanner = styled.div`
  position: relative;
  z-index: 1;
  padding: 14px;
  margin-bottom: 14px;
`;

const FeedTitle = styled.h1`
  margin: 0;
  letter-spacing: 0.22em;
  font-size: clamp(19px, 3.4vw, 31px);
  font-family: ${({ theme }) => theme.fonts.primary};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
  text-shadow: 0 0 18px rgba(146, 234, 255, 0.35);
`;

const FeedSubtitle = styled.p`
  margin: 6px 0 0;
  font-size: 11px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.9;
`;

const EcosTitle = styled.h2`
  margin: 0 0 8px;
  letter-spacing: 0.16em;
  font-size: 11px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const EcosRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(82px, 102px);
  gap: 10px;
  overflow-x: auto;
  padding: 4px 2px 14px;
  position: relative;
  z-index: 1;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 999px;
  }
`;

const EcoShard = styled.button`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  padding: 9px 8px 10px;
  display: grid;
  gap: 7px;
  justify-items: center;
  border-radius: ${({ theme }) => theme.card?.radius || '18px'};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 10px 24px rgba(115, 228, 255, 0.18);
  }
`;

const EcoCore = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #060a0f;
  font-weight: 700;
  font-size: 15px;
  background: ${({ theme }) => theme.gradients.chrome};
  border: 1px solid rgba(255, 255, 255, 0.55);
`;

const EcoLabel = styled.span`
  font-size: 11px;
  letter-spacing: 0.05em;
  opacity: 0.95;
`;

const Stack = styled.div`
  display: grid;
  gap: 14px;
  position: relative;
  z-index: 1;
`;

const Card = styled.article`
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const MediaType = styled.span`
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const AuthorButton = styled.button`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.card?.radius || '18px'};
  padding: 6px 11px;
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.accentSoft};
`;

const CardContent = styled.div`
  padding: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const TextBody = styled.p`
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
`;

const MediaImg = styled.img`
  width: 100%;
  max-height: 560px;
  object-fit: cover;
`;

const MediaVideo = styled.video`
  width: 100%;
  max-height: 560px;
  background: #05070b;
`;

const MediaAudio = styled.audio`
  width: 100%;
`;

const TrackBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.06)'};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 5px 12px 5px 8px;
  font-size: 11px;
  cursor: pointer;
  margin-top: 8px;
`;

const ActionRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0 14px 12px;
`;

const ActionButton = styled.button`
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
`;

const HarlequinMask = styled.span`
  position: relative;
  width: 18px;
  height: 22px;
  border: 1px solid currentColor;
  clip-path: polygon(18% 0, 50% 8%, 82% 0, 100% 28%, 90% 76%, 50% 100%, 10% 76%, 0 28%);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(90deg, rgba(250, 244, 198, 0.96) 0 48%, rgba(119, 230, 255, 0.92) 48% 100%)'
    : 'linear-gradient(90deg, rgba(255,255,255,0.20) 0 48%, rgba(130,180,220,0.14) 48% 100%)')};
  box-shadow: ${({ $active }) => ($active ? '0 0 12px rgba(126, 237, 255, 0.22)' : 'none')};

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    width: 6px;
    height: 6px;
    border-radius: 2px;
    border: 1px solid currentColor;
    background: currentColor;
    transform: rotate(45deg);
  }

  &::before {
    left: 1px;
  }

  &::after {
    right: 1px;
  }
`;

const HarlequinFace = styled.span`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  inset: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 7px;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #111820;
    box-shadow: 0 0 0 1px rgba(17, 24, 32, 0.18);
  }

  &::before {
    left: 5px;
  }

  &::after {
    right: 5px;
  }
`;

const HarlequinSmile = styled.span`
  position: absolute;
  left: 50%;
  bottom: 4px;
  transform: translateX(-50%);
  width: 8px;
  height: 4px;
  border-bottom: 1.5px solid #111820;
  border-radius: 0 0 8px 8px;
`;

const HarlequinTear = styled.span`
  position: absolute;
  top: 10px;
  right: 3px;
  width: 3px;
  height: 5px;
  background: rgba(17, 24, 32, 0.82);
  clip-path: polygon(50% 0, 100% 42%, 50% 100%, 0 42%);
`;

const CommentBox = styled.div`
  border-top: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.border};
  padding: 10px 14px 14px;
`;

const CommentList = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
`;

const CommentItem = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: ${({ theme }) => theme.card?.radius || '14px'};
  padding: 9px 10px;
  background: ${({ theme }) => theme.colors.accentSoft};
`;

const CommentForm = styled.form`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
`;

const CommentInput = styled.input`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.card?.radius || '14px'};
  padding: 11px 12px;
  font-size: 12px;
`;

const DiaryNotice = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FileInput = styled.input`
  display: block;
  width: 100%;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.text};
`;

const EmptyState = styled.p`
  text-align: center;
  opacity: 0.78;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 18px;
`;

const apiHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const postTypeLabel = (type) => {
  if (type === 'image') return 'foto';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  return 'texto';
};

const composerTitleByType = (type) => {
  if (type === 'photo') return 'cabina visual';
  if (type === 'video') return 'cabina video';
  if (type === 'song') return 'cabina audio';
  return 'bit de texto';
};

export default function Feed() {
  const navigate = useNavigate();
  const { appTheme } = useSkin();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingTrackPostId, setPlayingTrackPostId] = useState(null);
  const trackAudioRef = useRef(null);
  const [openComments, setOpenComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editRemoveMedia, setEditRemoveMedia] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const layoutTemplate = appTheme.profile?.layoutTemplate || 'classic';

  const ecos = useMemo(() => {
    const byOwner = [];
    const ownerSet = new Set();

    for (const post of posts) {
      const username = post.owner_username || 'anon';
      if (!ownerSet.has(username)) {
        ownerSet.add(username);
        byOwner.push({
          username,
          initial: username.charAt(0).toUpperCase()
        });
      }
      if (byOwner.length >= 10) {
        break;
      }
    }

    return byOwner;
  }, [posts]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/posts/?limit=50', {
        headers: apiHeaders()
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar el feed');
      }
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (type) => {
    navigate(`/editor?type=${type}`);
  };

  const toggleTrackPlayback = (post) => {
    const audioEl = trackAudioRef.current;
    if (!audioEl || !post.track_media_url) return;
    if (playingTrackPostId === post.id) {
      audioEl.pause();
      setPlayingTrackPostId(null);
      return;
    }
    audioEl.src = post.track_media_url;
    audioEl.play();
    setPlayingTrackPostId(post.id);
  };

  const toggleLike = async (postId) => {
    // Optimistic flip so the tap feels instant; reconciled with the real
    // count/state from the backend right after (or reverted on failure).
    setPosts((prev) => prev.map((p) => (
      p.id === postId
        ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
        : p
    )));

    try {
      const { data } = await api.post(`/posts/${postId}/like`);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
    } catch {
      // revert the optimistic flip
      setPosts((prev) => prev.map((p) => (
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
          : p
      )));
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      const { data } = await api.post(`/comments/${commentId}/like`);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? data : c))
      }));
    } catch {
      // leave state unchanged on failure
    }
  };

  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setEditDraft(post.content || '');
    setEditFile(null);
    setEditRemoveMedia(false);
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditDraft('');
    setEditFile(null);
    setEditRemoveMedia(false);
  };

  const saveEditPost = async (postId) => {
    const form = new FormData();
    form.append('content', editDraft.trim());
    if (editFile) {
      form.append('file', editFile);
    } else if (editRemoveMedia) {
      form.append('remove_media', 'true');
    }

    try {
      const { data } = await api.put(`/posts/${postId}`, form);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
      cancelEditPost();
    } catch {
      window.alert('No se pudo guardar la edición. Inténtalo de nuevo.');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('¿Borrar esta publicación? No se puede deshacer.')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      window.alert('No se pudo borrar la publicación. Inténtalo de nuevo.');
    }
  };

  const toggleComments = async (postId) => {
    const nextOpen = !openComments[postId];
    setOpenComments((prev) => ({
      ...prev,
      [postId]: nextOpen
    }));

    if (!nextOpen || commentsByPost[postId]) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        headers: apiHeaders()
      });
      if (!res.ok) {
        throw new Error('No se pudieron cargar comentarios');
      }
      const data = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: data
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const submitComment = async (postId, event) => {
    event.preventDefault();
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          ...apiHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      if (!res.ok) {
        throw new Error('No se pudo comentar');
      }

      const newComment = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
      }));
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: ''
      }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="chaplin-page-frame">
      <Shell className="chaplin-page-shell">
      <FeedGrid $layoutTemplate={layoutTemplate}>
      <FeedLeftRail $visible={['studio','terminal','edge','collector','arcade'].includes(layoutTemplate)}>
        <SidePanel className="chaplin-theme-panel">
          <EcosTitle>Ecos</EcosTitle>
          <EcosRail>
            <EcoShard type="button" onClick={() => openEditor('photo')}>
              <EcoCore>+</EcoCore>
              <EcoLabel>tu eco</EcoLabel>
            </EcoShard>

            {ecos.map((eco) => (
              <EcoShard
                key={eco.username}
                type="button"
                onClick={() => navigate(`/profile/${eco.username}`)}
              >
                <EcoCore>{eco.initial}</EcoCore>
                <EcoLabel>@{eco.username}</EcoLabel>
              </EcoShard>
            ))}
          </EcosRail>
        </SidePanel>
      </FeedLeftRail>

      <FeedCenter>
      <TopBanner className="chaplin-theme-panel">
        <FeedTitle>Chaplin Main Grid</FeedTitle>
        <FeedSubtitle>Neon social chassis / y2k cyberchrome stream</FeedSubtitle>
      </TopBanner>

      <Stack>
        {!loading && posts.length === 0 && (
          <EmptyState>No hay publicaciones todavia. Inicia la primera transmision.</EmptyState>
        )}

        {posts.map((post) => {
          const type = post.media_type || 'text';
          const postComments = commentsByPost[post.id] || [];

          return (
            <Card className="chaplin-theme-panel" key={post.id}>
              <CardHeader>
                <MediaType>{postTypeLabel(type)}</MediaType>
                {post.owner_username ? (
                  <AuthorButton
                    type="button"
                    onClick={() => navigate(`/profile/${post.owner_username}`)}
                  >
                    @{post.owner_username}
                  </AuthorButton>
                ) : (
                  <AuthorButton type="button">@anon</AuthorButton>
                )}
              </CardHeader>

              {type === 'image' && post.media_url && <MediaImg src={post.media_url} alt="post" />}
              {type === 'video' && post.media_url && <MediaVideo src={post.media_url} controls />}

              {post.track_media_url && (
                <TrackBadge type="button" onClick={() => toggleTrackPlayback(post)}>
                  {playingTrackPostId === post.id ? <Pause size={12} /> : <Play size={12} />}
                  {post.track_title || 'cancion'}
                </TrackBadge>
              )}

              <CardContent>
                {type === 'text' && (
                  <DiaryNotice>
                    @{post.owner_username || 'anon'} ha escrito en su diario.
                  </DiaryNotice>
                )}
                {type === 'audio' && post.media_url && <MediaAudio src={post.media_url} controls />}
                {editingPostId === post.id ? (
                  <CommentForm onSubmit={(event) => { event.preventDefault(); saveEditPost(post.id); }}>
                    <CommentInput
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      autoFocus
                    />
                    {post.media_url && !editFile && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={editRemoveMedia}
                          onChange={(event) => setEditRemoveMedia(event.target.checked)}
                        />
                        Quitar archivo adjunto
                      </label>
                    )}
                    <FileInput
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={(event) => {
                        setEditFile(event.target.files?.[0] || null);
                        setEditRemoveMedia(false);
                      }}
                    />
                    {editFile && <span style={{ fontSize: 12, opacity: 0.8 }}>Nuevo archivo: {editFile.name}</span>}
                    <ActionButton type="submit">Guardar</ActionButton>
                    <ActionButton type="button" onClick={cancelEditPost}>Cancelar</ActionButton>
                  </CommentForm>
                ) : (
                  post.content && <TextBody>{post.content}</TextBody>
                )}
              </CardContent>

              <ActionRow>
                <ActionButton type="button" onClick={() => toggleLike(post.id)}>
                  <HarlequinMask $active={Boolean(post.liked_by_me)}>
                    <HarlequinFace />
                    <HarlequinSmile />
                    <HarlequinTear />
                  </HarlequinMask>
                  ovacion {post.like_count || 0}
                </ActionButton>

                <ActionButton type="button" onClick={() => toggleComments(post.id)}>
                  <MessageCircle size={14} />
                  ecochat
                </ActionButton>

                <ActionButton
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(window.location.href)}
                >
                  <Send size={14} />
                  relay
                </ActionButton>

                {user && post.owner_id === user.id && editingPostId !== post.id && (
                  <>
                    <ActionButton type="button" onClick={() => startEditPost(post)}>
                      editar
                    </ActionButton>
                    <ActionButton type="button" onClick={() => deletePost(post.id)}>
                      borrar
                    </ActionButton>
                  </>
                )}
              </ActionRow>

              {openComments[post.id] && (
                <CommentBox>
                  <CommentList>
                    {postComments.map((comment) => (
                      <CommentItem key={comment.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                          <div>
                            {comment.owner_username && (
                              <strong style={{ marginRight: 6 }}>@{comment.owner_username}</strong>
                            )}
                            {comment.content}
                          </div>
                          <ActionButton
                            type="button"
                            onClick={() => toggleCommentLike(post.id, comment.id)}
                            style={{ flexShrink: 0 }}
                          >
                            ♥ {comment.like_count || 0}
                          </ActionButton>
                        </div>
                      </CommentItem>
                    ))}
                  </CommentList>

                  <CommentForm onSubmit={(event) => submitComment(post.id, event)}>
                    <CommentInput
                      placeholder="inyecta texto al canal..."
                      value={commentDrafts[post.id] || ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: value
                        }));
                      }}
                    />
                    <ActionButton type="submit">send</ActionButton>
                  </CommentForm>
                </CommentBox>
              )}
            </Card>
          );
        })}
      </Stack>
      <audio ref={trackAudioRef} onEnded={() => setPlayingTrackPostId(null)} style={{ display: 'none' }} />
      </FeedCenter>

      <FeedRightRail
        $visible={['studio','terminal','edge','collector','arcade'].includes(layoutTemplate)}
        $mobileVisible={['edge','studio','collector','arcade'].includes(layoutTemplate)}
      >
        <SidePanel className="chaplin-theme-panel">
          <SideTitle>Publicar</SideTitle>
          <ActionButton type="button" onClick={() => openEditor('photo')}>
            <PlusSquare size={14} />
            foto
          </ActionButton>
          <ActionButton type="button" onClick={() => openEditor('video')}>
            <Video size={14} />
            video
          </ActionButton>
          <ActionButton type="button" onClick={() => openEditor('song')}>
            <Music size={14} />
            audio
          </ActionButton>
          <ActionButton type="button" onClick={() => openEditor('diary')}>
            <BookOpen size={14} />
            diario
          </ActionButton>
        </SidePanel>
      </FeedRightRail>
      </FeedGrid>
      </Shell>
    </div>
  );
}
