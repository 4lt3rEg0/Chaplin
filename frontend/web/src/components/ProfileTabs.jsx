import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Heart, Music, Pause, Pin, PinOff, Play, Radio, Star, Upload, Video, X } from 'lucide-react';
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
  grid-template-columns: 36px 1fr auto auto;
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

const TrackMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
`;

const StatusPill = styled.span`
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 999px;
  background: ${({ $tone }) => (
    $tone === 'approved' ? 'rgba(61,220,132,0.18)'
      : $tone === 'pending' ? 'rgba(245,166,35,0.18)'
        : $tone === 'rejected' ? 'rgba(255,107,107,0.18)'
          : 'rgba(255,255,255,0.08)'
  )};
  color: ${({ $tone }) => (
    $tone === 'approved' ? '#3ddc84'
      : $tone === 'pending' ? '#f5a623'
        : $tone === 'rejected' ? '#ff6b6b'
          : 'inherit'
  )};
`;

const PinBtn = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ $pinned, $accentColor, theme }) => ($pinned ? $accentColor : theme.colors?.textSecondary || '#999')};
  display: grid;
  place-items: center;
  padding: 6px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FavBtn = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ $favorited, $accentColor, theme }) => ($favorited ? $accentColor : theme.colors?.textSecondary || '#999')};
  display: grid;
  place-items: center;
  padding: 6px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UploadToggleBtn = styled.button`
  border: 1px solid ${({ $accentColor }) => $accentColor};
  background: transparent;
  color: ${({ $accentColor }) => $accentColor};
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
`;

const UploadForm = styled.form`
  border: 1px dashed ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
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
  const [profilePlaylist, setProfilePlaylist] = useState(null);
  const [pinBusyId, setPinBusyId] = useState(null);
  const [favBusyId, setFavBusyId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadArtwork, setUploadArtwork] = useState(null);
  const [uploadToRadio, setUploadToRadio] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
      if (isOwnProfile) {
        Promise.all([
          api.get('/tracks/mine'),
          api.get('/playlists/mine/profile').catch(() => ({ data: null }))
        ])
          .then(([tracksRes, playlistRes]) => {
            setTracks(tracksRes.data);
            setProfilePlaylist(playlistRes.data);
          })
          .catch(() => setTracks([]))
          .finally(markLoaded);
      } else {
        api.get(`/playlists/profile/${user.username}`)
          .then(({ data }) => setTracks(data.tracks || []))
          .catch(() => setTracks([]))
          .finally(markLoaded);
      }
    }
  }, [activeTab, user?.username, loaded, isOwnProfile]);

  const pinnedTrackIds = new Set((profilePlaylist?.tracks || []).map((t) => t.id));

  const togglePin = async (track) => {
    if (!profilePlaylist || pinBusyId) return;
    setPinBusyId(track.id);
    try {
      const isPinned = pinnedTrackIds.has(track.id);
      const { data } = isPinned
        ? await api.delete(`/playlists/${profilePlaylist.id}/items/${track.id}`)
        : await api.post(`/playlists/${profilePlaylist.id}/items`, { track_id: track.id });
      setProfilePlaylist(data);
    } finally {
      setPinBusyId(null);
    }
  };

  const toggleFavorite = async (track) => {
    if (favBusyId) return;
    setFavBusyId(track.id);
    try {
      const { data } = await api.put(`/tracks/${track.id}`, { is_favorited: !track.is_favorited });
      setTracks((prev) => prev.map((t) => (t.id === track.id ? data : t)));
    } finally {
      setFavBusyId(null);
    }
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError('Elige un archivo de audio y escribe un título.');
      return;
    }
    setUploadBusy(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('title', uploadTitle.trim());
      form.append('target', uploadToRadio ? 'radio' : 'personal');
      if (uploadArtwork) form.append('artwork', uploadArtwork);
      const { data: newTrack } = await api.post('/tracks/upload', form, { timeout: 60000 });
      setTracks((prev) => [newTrack, ...prev]);
      setUploadTitle('');
      setUploadFile(null);
      setUploadArtwork(null);
      setUploadToRadio(false);
      setUploadOpen(false);
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'No se pudo subir la canción. Inténtalo de nuevo.');
    } finally {
      setUploadBusy(false);
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
        <>
          {isOwnProfile && (
            <>
              <UploadToggleBtn type="button" $accentColor={accentColor} onClick={() => setUploadOpen((prev) => !prev)}>
                <Upload size={14} />
                {uploadOpen ? 'Cerrar' : 'Subir canción'}
              </UploadToggleBtn>

              {uploadOpen && (
                <UploadForm onSubmit={submitUpload} $borderColor={borderColor}>
                  <UploadInput
                    type="text"
                    placeholder="Título de la canción"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    $borderColor={borderColor}
                    disabled={uploadBusy}
                  />
                  <UploadInput
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    $borderColor={borderColor}
                    disabled={uploadBusy}
                  />
                  <div>
                    <StatusPill $tone="idle">Portada (opcional)</StatusPill>
                  </div>
                  <UploadInput
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadArtwork(e.target.files?.[0] || null)}
                    $borderColor={borderColor}
                    disabled={uploadBusy}
                  />
                  <UploadCheckRow>
                    <input
                      type="checkbox"
                      checked={uploadToRadio}
                      onChange={(e) => setUploadToRadio(e.target.checked)}
                      disabled={uploadBusy}
                    />
                    <Radio size={14} />
                    Enviar también a Radio Chaplin (queda pendiente de revisión)
                  </UploadCheckRow>
                  {uploadError && <UploadError>{uploadError}</UploadError>}
                  <UploadSubmitBtn type="submit" $accentColor={accentColor} disabled={uploadBusy}>
                    {uploadBusy ? 'Subiendo...' : 'Publicar canción'}
                  </UploadSubmitBtn>
                </UploadForm>
              )}
            </>
          )}

          {tracks.length === 0 && loaded.musica ? (
            <EmptyState>{isOwnProfile ? 'Todavía no subiste canciones.' : 'Sin música fijada en este perfil.'}</EmptyState>
          ) : (
            <BitacoraList>
              {tracks.map((track) => (
                <TrackRow key={track.id} $borderColor={borderColor}>
                  <PlayBtn type="button" $accentColor={accentColor} onClick={() => toggleTrack(track)}>
                    {playingTrackId === track.id ? <Pause size={14} /> : <Play size={14} />}
                  </PlayBtn>
                  <div>
                    <TrackTitle>{track.title}</TrackTitle>
                    {isOwnProfile && (
                      <TrackMeta>
                        {track.radio_status === 'pending' && <StatusPill $tone="pending">En revisión</StatusPill>}
                        {track.radio_status === 'approved' && <StatusPill $tone="approved">En Radio Chaplin</StatusPill>}
                        {track.radio_status === 'rejected' && <StatusPill $tone="rejected">Radio: rechazada</StatusPill>}
                      </TrackMeta>
                    )}
                  </div>
                  {isOwnProfile && (
                    <FavBtn
                      type="button"
                      $favorited={track.is_favorited}
                      $accentColor={accentColor}
                      disabled={favBusyId === track.id}
                      onClick={() => toggleFavorite(track)}
                      title={track.is_favorited ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    >
                      <Star size={14} fill={track.is_favorited ? accentColor : 'none'} />
                    </FavBtn>
                  )}
                  {isOwnProfile && (
                    <PinBtn
                      type="button"
                      $pinned={pinnedTrackIds.has(track.id)}
                      $accentColor={accentColor}
                      disabled={pinBusyId === track.id}
                      onClick={() => togglePin(track)}
                      title={pinnedTrackIds.has(track.id) ? 'Quitar de mi perfil' : 'Fijar en mi perfil'}
                    >
                      {pinnedTrackIds.has(track.id) ? <Pin size={14} /> : <PinOff size={14} />}
                    </PinBtn>
                  )}
                </TrackRow>
              ))}
              <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} style={{ display: 'none' }} />
            </BitacoraList>
          )}
        </>
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
