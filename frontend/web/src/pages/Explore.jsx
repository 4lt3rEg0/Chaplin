import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Hash, MessageSquare, Music, Pause, Play, Search } from "lucide-react";
import api from "../services/api";

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
  background: ${({ theme }) => theme.card?.bg || "rgba(255,255,255,0.04)"};
  color: ${({ theme }) => theme.colors.text};
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
`;

const SearchBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 0 12px;
  background: ${({ theme }) => theme.card?.bg || "rgba(255,255,255,0.04)"};
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  padding: 10px 0;
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const ForumLink = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || "rgba(255,255,255,0.04)"};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 14px;
  overflow-x: auto;
`;

const TabButton = styled.button`
  flex: 1;
  border: none;
  background: none;
  padding: 10px 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textSecondary)};
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : "transparent")};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
`;

const StatusText = styled.p`
  text-align: center;
  opacity: 0.72;
  font-size: 13px;
  margin: 24px 0;
`;

const ResultList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ResultRow = styled.div`
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.card?.bg || "rgba(255,255,255,0.04)"};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary || theme.colors.borderStrong};
  }
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.primary}55);
  display: grid;
  place-items: center;
  font-weight: 700;
  position: relative;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const OnlineDot = styled.span`
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #3ddc84;
  border: 2px solid ${({ theme }) => theme.card?.bg || "#0a0d14"};
`;

const NameBlock = styled.div`
  min-width: 0;
`;

const DisplayName = styled.div`
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Handle = styled.div`
  font-size: 12px;
  opacity: 0.68;
`;

const FollowButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.primary || theme.colors.borderStrong};
  border-radius: 10px;
  background: ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : "transparent")};
  color: ${({ $active, theme }) => ($active ? (theme.card?.bg || "#0a0d14") : (theme.colors.primary || theme.colors.text))};
  font-size: 11px;
  font-weight: 700;
  padding: 7px 12px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PostThumb = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => theme.card?.bg || "rgba(255,255,255,0.06)"};
  display: grid;
  place-items: center;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostSnippet = styled.div`
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const PlayBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: ${({ theme }) => `${theme.colors.primary}22`};
  color: ${({ theme }) => theme.colors.primary};
`;

const TagCount = styled.span`
  font-size: 11px;
  opacity: 0.65;
`;

const TABS = [
  { id: "usuarios", label: "Usuarios" },
  { id: "publicaciones", label: "Publicaciones" },
  { id: "musica", label: "Música" },
  { id: "etiquetas", label: "Etiquetas" }
];

export default function Explore() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [activeTab, setActiveTab] = useState("usuarios");
  const [results, setResults] = useState({ usuarios: [], publicaciones: [], musica: [], etiquetas: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followSaving, setFollowSaving] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const query = term.trim();
    if (query.length === 0) {
      setResults({ usuarios: [], publicaciones: [], musica: [], etiquetas: [] });
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const [usuarios, publicaciones, musica, etiquetas] = await Promise.all([
          api.get("/users/search", { params: { q: query } }).then((r) => r.data).catch(() => []),
          api.get("/posts/search", { params: { q: query } }).then((r) => r.data).catch(() => []),
          api.get("/tracks/search", { params: { q: query } }).then((r) => r.data).catch(() => []),
          api.get("/tags/search", { params: { q: query } }).then((r) => r.data).catch(() => [])
        ]);
        setResults({ usuarios, publicaciones, musica, etiquetas });
        setError("");
      } catch {
        setError("No se pudo buscar. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(debounceRef.current);
  }, [term]);

  const toggleFollow = async (event, targetUser) => {
    event.stopPropagation();
    if (followSaving) return;
    setFollowSaving(targetUser.username);
    setResults((prev) => ({
      ...prev,
      usuarios: prev.usuarios.map((u) => (
        u.username === targetUser.username
          ? { ...u, is_following: !u.is_following, follower_count: Math.max(0, u.follower_count + (u.is_following ? -1 : 1)) }
          : u
      ))
    }));
    try {
      const { data } = await api.post(`/users/${targetUser.username}/follow`);
      setResults((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.username === targetUser.username ? { ...u, ...data } : u))
      }));
    } catch {
      setResults((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.username === targetUser.username ? targetUser : u))
      }));
    } finally {
      setFollowSaving(null);
    }
  };

  const toggleTrack = (track) => {
    const el = audioRef.current;
    if (!el) return;
    if (playingTrackId === track.id) {
      el.pause();
      setPlayingTrackId(null);
      return;
    }
    el.src = track.media_url;
    el.play();
    setPlayingTrackId(track.id);
  };

  const activeResults = results[activeTab] || [];
  const query = term.trim();

  return (
    <Wrapper>
      <Shell>
        <HeaderRow>
          <BackButton type="button" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft size={16} />
          </BackButton>
          <SearchBox>
            <Search size={16} />
            <SearchInput
              ref={inputRef}
              type="text"
              placeholder="Buscar usuarios, posts, música, etiquetas..."
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </SearchBox>
        </HeaderRow>

        <ForumLink type="button" onClick={() => navigate('/forum')}>
          <MessageSquare size={16} /> Ir al Foro — hilos y debates por categoría
        </ForumLink>

        <TabBar>
          {TABS.map((tab) => (
            <TabButton key={tab.id} type="button" $active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </TabButton>
          ))}
        </TabBar>

        {loading && <StatusText>Buscando...</StatusText>}
        {!loading && error && <StatusText>{error}</StatusText>}
        {!loading && !error && query.length === 0 && (
          <StatusText>Escribe algo para explorar usuarios, publicaciones, música o etiquetas.</StatusText>
        )}
        {!loading && !error && query.length > 0 && activeResults.length === 0 && (
          <StatusText>Sin resultados para "{query}" en {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}.</StatusText>
        )}

        {activeTab === "usuarios" && (
          <ResultList>
            {results.usuarios.map((u) => (
              <ResultRow key={u.id} onClick={() => navigate(`/profile/${u.username}`)}>
                <Avatar>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" /> : u.username[0]?.toUpperCase()}
                  {u.is_online && <OnlineDot />}
                </Avatar>
                <NameBlock>
                  <DisplayName>{u.first_name} {u.last_name}</DisplayName>
                  <Handle>@{u.username} · {u.follower_count} seguidores</Handle>
                </NameBlock>
                <FollowButton
                  type="button"
                  $active={u.is_following}
                  disabled={followSaving === u.username}
                  onClick={(event) => toggleFollow(event, u)}
                >
                  {u.is_following ? "Siguiendo" : "Seguir"}
                </FollowButton>
              </ResultRow>
            ))}
          </ResultList>
        )}

        {activeTab === "publicaciones" && (
          <ResultList>
            {results.publicaciones.map((post) => (
              <ResultRow key={post.id} onClick={() => navigate(`/profile/${post.owner_username}`)}>
                <PostThumb>
                  {post.media_type === "video" ? (
                    <video src={post.media_url} muted />
                  ) : post.media_type === "image" ? (
                    <img src={post.media_url} alt="" />
                  ) : null}
                </PostThumb>
                <NameBlock>
                  <DisplayName>@{post.owner_username}</DisplayName>
                  <PostSnippet>{post.content}</PostSnippet>
                </NameBlock>
                <TagCount>♥ {post.like_count || 0}</TagCount>
              </ResultRow>
            ))}
          </ResultList>
        )}

        {activeTab === "musica" && (
          <ResultList>
            {results.musica.map((track) => (
              <ResultRow key={track.id} onClick={() => navigate(`/profile/${track.owner_username}`)}>
                <PlayBtn
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleTrack(track);
                  }}
                >
                  {playingTrackId === track.id ? <Pause size={14} /> : <Play size={14} />}
                </PlayBtn>
                <NameBlock>
                  <DisplayName>{track.title}</DisplayName>
                  <Handle>@{track.owner_username}</Handle>
                </NameBlock>
                <Music size={16} style={{ opacity: 0.5 }} />
              </ResultRow>
            ))}
            <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} style={{ display: "none" }} />
          </ResultList>
        )}

        {activeTab === "etiquetas" && (
          <ResultList>
            {results.etiquetas.map((row) => (
              <ResultRow key={row.tag} onClick={() => navigate(`/feed?tag=${encodeURIComponent(row.tag)}`)}>
                <Avatar><Hash size={18} /></Avatar>
                <NameBlock>
                  <DisplayName>#{row.tag}</DisplayName>
                </NameBlock>
                <TagCount>{row.count} posts</TagCount>
              </ResultRow>
            ))}
          </ResultList>
        )}
      </Shell>
    </Wrapper>
  );
}
