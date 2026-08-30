import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Heart, Music, Pause, Play, Video, X } from 'lucide-react';
import { useSkin } from '../context/SkinContext';
import api from '../services/api';
import { Z_INDEX } from '../styles/zIndexScale';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ $borderColor }) => $borderColor};
`;

const TabButton = styled.button`
  flex: 1;
  border: none;
  background: none;
  padding: 12px 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  color: ${({ $active, $textColor }) => ($active ? $textColor : `${$textColor}77`)};
  border-bottom: 2px solid ${({ $active, $accentColor }) => ($active ? $accentColor : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
`;

const GridCell = styled.button`
  position: relative;
  border: none;
  padding: 0;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.05)'};

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const VideoBadge = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  color: #fff;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.7));
`;

const EmptyState = styled.p`
  text-align: center;
  opacity: 0.7;
  font-size: 13px;
  padding: 30px 10px;
`;

const BitacoraList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BitacoraCard = styled.div`
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: 14px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
`;

const BitacoraDate = styled.div`
  font-size: 11px;
  opacity: 0.6;
  margin-bottom: 6px;
`;

const BitacoraContent = styled.p`
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const LikeButton = styled.button`
  border: none;
  background: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  color: ${({ $liked, $accentColor, $textColor }) => ($liked ? $accentColor : $textColor)};
  padding: 0;
`;

const TrackRow = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
`;

const PlayBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: ${({ $accentColor }) => `${$accentColor}22`};
  color: ${({ $accentColor }) => $accentColor};
`;

const TrackTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Lightbox = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL};
  background: rgba(0, 0, 0, 0.92);
  display: grid;
  grid-template-rows: auto 1fr auto;
`;

const LightboxTop = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 0;
`;

const LightboxClose = styled.button`
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.08);
  color: #fff;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const LightboxStage = styled.div`
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 12px;

  img, video {
    max-width: 100%;
    max-height: 100%;
  }
`;

const LightboxFooter = styled.div`
  color: #fff;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
`;

const LightboxContent = styled.p`
  margin: 0 0 10px;
  font-size: 14px;
`;

const ProfileTabs = ({ user, isOwnProfile }) => {
  const { skinData, appTheme } = useSkin();
  const [activeTab, setActiveTab] = useState('publicaciones');
  const [mediaPosts, setMediaPosts] = useState([]);
  const [textPosts, setTextPosts] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loaded, setLoaded] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

  const textColor = appTheme.colors?.text || '#fff';
  const accentColor = skinData?.accent || '#ff00ff';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.12)';

  useEffect(() => {
    if (!user?.username) return;
    setActiveTab('publicaciones');
    setLoaded({});
    setMediaPosts([]);
    setTextPosts([]);
    setTracks([]);
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username || loaded[activeTab]) return;

    const markLoaded = () => setLoaded((prev) => ({ ...prev, [activeTab]: true }));

    if (activeTab === 'publicaciones') {
      api.get(`/posts/by-user/${user.username}`, { params: { media: 'media' } })
        .then(({ data }) => setMediaPosts(data))
        .catch(() => setMediaPosts([]))
        .finally(markLoaded);
    } else if (activeTab === 'bitacora') {
      api.get(`/posts/by-user/${user.username}`, { params: { media: 'text' } })
        .then(({ data }) => setTextPosts(data))
        .catch(() => setTextPosts([]))
        .finally(markLoaded);
    } else if (activeTab === 'musica') {
      api.get(`/tracks/by-user/${user.username}`)
        .then(({ data }) => setTracks(data))
        .catch(() => setTracks([]))
        .finally(markLoaded);
    }
  }, [activeTab, user?.username, loaded]);

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

  const toggleLike = async (post, updateList) => {
    updateList((prev) => prev.map((p) => (
      p.id === post.id
        ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
        : p
    )));
    try {
      const { data } = await api.post(`/posts/${post.id}/like`);
      updateList((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...data } : p)));
      setSelectedPost((prev) => (prev && prev.id === post.id ? { ...prev, ...data } : prev));
    } catch {
      updateList((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    }
  };

  return (
    <Wrapper>
      <TabBar $borderColor={borderColor}>
        <TabButton type="button" $active={activeTab === 'publicaciones'} $textColor={textColor} $accentColor={accentColor} onClick={() => setActiveTab('publicaciones')}>
          Publicaciones
        </TabButton>
        <TabButton type="button" $active={activeTab === 'musica'} $textColor={textColor} $accentColor={accentColor} onClick={() => setActiveTab('musica')}>
          <Music size={13} /> Música
        </TabButton>
        <TabButton type="button" $active={activeTab === 'bitacora'} $textColor={textColor} $accentColor={accentColor} onClick={() => setActiveTab('bitacora')}>
          Bitácora
        </TabButton>
      </TabBar>

      {activeTab === 'publicaciones' && (
        mediaPosts.length === 0 && loaded.publicaciones ? (
          <EmptyState>{isOwnProfile ? 'Todavía no publicaste fotos ni videos.' : 'Sin publicaciones todavía.'}</EmptyState>
        ) : (
          <Grid>
            {mediaPosts.map((post) => (
              <GridCell key={post.id} type="button" onClick={() => setSelectedPost(post)}>
                {post.media_type === 'video' ? (
                  <>
                    <video src={post.media_url} muted />
                    <VideoBadge><Video size={16} /></VideoBadge>
                  </>
                ) : (
                  <img src={post.media_url} alt="" />
                )}
              </GridCell>
            ))}
          </Grid>
        )
      )}

      {activeTab === 'bitacora' && (
        textPosts.length === 0 && loaded.bitacora ? (
          <EmptyState>{isOwnProfile ? 'Todavía no escribiste en tu bitácora.' : 'Sin entradas todavía.'}</EmptyState>
        ) : (
          <BitacoraList>
            {textPosts.map((post) => (
              <BitacoraCard key={post.id} $borderColor={borderColor}>
                <BitacoraDate>{new Date(post.created_at).toLocaleDateString()}</BitacoraDate>
                <BitacoraContent>{post.content}</BitacoraContent>
                <LikeButton type="button" $liked={post.liked_by_me} $accentColor={accentColor} $textColor={textColor} onClick={() => toggleLike(post, setTextPosts)}>
                  <Heart size={14} fill={post.liked_by_me ? accentColor : 'none'} />
                  {post.like_count || 0}
                </LikeButton>
              </BitacoraCard>
            ))}
          </BitacoraList>
        )
      )}

      {activeTab === 'musica' && (
        tracks.length === 0 && loaded.musica ? (
          <EmptyState>{isOwnProfile ? 'Todavía no subiste canciones.' : 'Sin música todavía.'}</EmptyState>
        ) : (
          <BitacoraList>
            {tracks.map((track) => (
              <TrackRow key={track.id} $borderColor={borderColor}>
                <PlayBtn type="button" $accentColor={accentColor} onClick={() => toggleTrack(track)}>
                  {playingTrackId === track.id ? <Pause size={14} /> : <Play size={14} />}
                </PlayBtn>
                <TrackTitle>{track.title}</TrackTitle>
              </TrackRow>
            ))}
            <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} style={{ display: 'none' }} />
          </BitacoraList>
        )
      )}

      {selectedPost && (
        <Lightbox>
          <LightboxTop>
            <LightboxClose type="button" onClick={() => setSelectedPost(null)} aria-label="Cerrar">
              <X size={16} />
            </LightboxClose>
          </LightboxTop>
          <LightboxStage>
            {selectedPost.media_type === 'video' ? (
              <video src={selectedPost.media_url} controls autoPlay />
            ) : (
              <img src={selectedPost.media_url} alt="" />
            )}
          </LightboxStage>
          <LightboxFooter>
            {selectedPost.content && <LightboxContent>{selectedPost.content}</LightboxContent>}
            <LikeButton type="button" $liked={selectedPost.liked_by_me} $accentColor={accentColor} $textColor="#fff" onClick={() => toggleLike(selectedPost, setMediaPosts)}>
              <Heart size={16} fill={selectedPost.liked_by_me ? accentColor : 'none'} />
              {selectedPost.like_count || 0}
            </LikeButton>
          </LightboxFooter>
        </Lightbox>
      )}
    </Wrapper>
  );
};

export default React.memo(ProfileTabs);
