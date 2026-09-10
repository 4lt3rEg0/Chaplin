import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Music, Radio, Plus, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useSkin } from '../context/SkinContext';
import api from '../services/api';
import {
  resolveCardTexture,
  resolveMaterialOverlay,
  resolveShapeClipPath,
  resolveShapeRadius,
  resolveWidgetRadius
} from '../styles/hudTokens';

const Card = styled.div.attrs((props) => ({ 'data-shape': props.$shape || 'rounded' }))`
  padding: var(--card-inset-y) var(--card-inset-x);
  min-width: 0;
  min-height: var(--card-min-height);
  border-radius: ${(props) => resolveShapeRadius(props.$shape, '20px')};
  clip-path: ${(props) => resolveShapeClipPath(props.$shape)};
  background: ${(props) => props.$cardBg};
  border: 1px ${(props) => props.$cardFrame || 'solid'} ${(props) => props.$borderColor};
  box-shadow: ${(props) => props.$cardShadow || '0 8px 32px rgba(0, 0, 0, 0.3)'};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${(props) => resolveMaterialOverlay(props.$material)};
    opacity: 0.8;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${(props) => resolveCardTexture(props.$material)};
    opacity: calc(0.04 + var(--material-intensity, .72) * .42);
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${(props) => props.$accentColor};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GroupTitle = styled.h4`
  margin: 14px 0 10px;
  font-size: 12px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${(props) => props.$textColor}cc;
`;

const Hint = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  color: ${(props) => props.$textColor}aa;
  line-height: 1.45;
`;

const TrackList = styled.div`
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TrackItem = styled.div`
  border: 1px solid ${(props) => props.$accentColor}33;
  background: ${(props) => props.$accentColor}12;
  border-radius: ${(props) => resolveWidgetRadius(props.$widgetShape)};
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const TrackInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const TrackName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.$textColor};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackMeta = styled.div`
  margin-top: 3px;
  font-size: 11px;
  color: ${(props) => props.$textColor}aa;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const SelectBtn = styled.button`
  border: 1px solid ${(props) => (props.$selected ? props.$accentColor : props.$accentColor + '66')};
  background: ${(props) => (props.$selected ? props.$accentColor + '35' : 'transparent')};
  color: ${(props) => props.$textColor};
  border-radius: ${(props) => resolveWidgetRadius(props.$widgetShape)};
  min-width: 82px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  font-size: 11px;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const Empty = styled.div`
  border: 1px dashed ${(props) => props.$borderColor};
  border-radius: ${(props) => resolveWidgetRadius(props.$widgetShape)};
  padding: 12px;
  font-size: 12px;
  color: ${(props) => props.$textColor}aa;
`;

// Usernames allowed to curate the global Chaplin Radio playlist — mirrors the
// backend's RADIO_CURATORS allowlist (backend/app/main.py). There is no real
// roles system yet, so `user.role` (referenced by the old version of this file)
// never actually existed on the backend User model.
const RADIO_CURATORS = new Set(['root', 'testchaplin']);

const trackToPlayerShape = (track) => ({
  id: track.id,
  src: track.media_url,
  title: track.title || 'Untitled Track',
  artist: track.owner_username || 'Chaplin'
});

const LEGACY_MIGRATION_FLAG = 'chaplin_playlist_migrated_v1';

export default function ProfilePlaylistCard() {
  const { user } = useAuth();
  const { skinData, appTheme } = useSkin();
  const { setPersonalPlaylist, setChaplinRadioTracks } = usePlayer();

  const [myTracks, setMyTracks] = useState([]);
  const [personalPlaylist, setPersonalPlaylistLocal] = useState(null); // backend Playlist object
  const [chaplinPlaylist, setChaplinPlaylistLocal] = useState(null); // backend Playlist object, curators only
  const [loading, setLoading] = useState(true);
  const [busyTrackId, setBusyTrackId] = useState(null);
  const migratedRef = useRef(false);

  const isCurator = Boolean(user?.username && RADIO_CURATORS.has(user.username));

  const cardBg = appTheme.card?.bg || 'rgba(255,255,255,0.05)';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.1)';
  const accentColor = skinData?.accent || '#ff00ff';
  const textColor = appTheme.colors?.text || '#fff';
  const cardShape = appTheme.card?.shape || 'rounded';
  const widgetShape = appTheme.card?.widgetShape || 'rounded';
  const material = appTheme.card?.material || 'glass';
  const cardFrame = appTheme.card?.frame || 'solid';
  const cardShadow = appTheme.card?.shadow || '0 8px 32px rgba(0,0,0,0.3)';

  // Push the resolved server playlists into PlayerContext so Radio.jsx / the
  // global player keep working unchanged — PlayerContext's personalPlaylist /
  // chaplinRadioTracks are now a materialized cache of the backend data, not
  // the source of truth (that's the Playlist/Track API below).
  useEffect(() => {
    if (personalPlaylist) {
      setPersonalPlaylist((personalPlaylist.tracks || []).map(trackToPlayerShape));
    }
  }, [personalPlaylist, setPersonalPlaylist]);

  useEffect(() => {
    if (chaplinPlaylist) {
      setChaplinRadioTracks((chaplinPlaylist.tracks || []).map(trackToPlayerShape));
    }
  }, [chaplinPlaylist, setChaplinRadioTracks]);

  useEffect(() => {
    let cancelled = false;

    const migrateLegacyLocalStorage = async (personal) => {
      // One-time client migration: if this browser has an old localStorage
      // selection and the server-side personal playlist is still empty, push
      // those tracks up once. After that the flag prevents re-adding on every
      // reload — the server becomes canonical from here on.
      if (migratedRef.current) return personal;
      migratedRef.current = true;
      if (localStorage.getItem(LEGACY_MIGRATION_FLAG)) return personal;

      let legacy = [];
      try {
        legacy = JSON.parse(localStorage.getItem('chaplin_personal_playlist') || '[]');
      } catch {
        legacy = [];
      }

      if (!Array.isArray(legacy) || legacy.length === 0 || (personal.tracks || []).length > 0) {
        localStorage.setItem(LEGACY_MIGRATION_FLAG, '1');
        return personal;
      }

      let updated = personal;
      for (const legacyTrack of legacy) {
        const match = (await api.get('/tracks/mine')).data.find((t) => t.media_url === legacyTrack.src);
        if (match) {
          const { data } = await api.post(`/playlists/${personal.id}/items`, { track_id: match.id });
          updated = data;
        }
      }
      localStorage.setItem(LEGACY_MIGRATION_FLAG, '1');
      return updated;
    };

    const load = async () => {
      setLoading(true);
      try {
        const [tracksRes, postsRes, personalRes] = await Promise.all([
          api.get('/tracks/mine'),
          api.get('/posts/'),
          api.get('/playlists/mine/personal')
        ]);
        if (cancelled) return;

        let tracks = tracksRes.data || [];
        const trackedPostIds = new Set(tracks.filter((t) => t.source_post_id).map((t) => t.source_post_id));
        const ownAudioPosts = (postsRes.data || []).filter(
          (post) => post.media_type === 'audio' && post.media_url && post.owner_id === user?.id && !trackedPostIds.has(post.id)
        );

        // Lazily back-fill Tracks for any of the user's own audio Posts that
        // don't have one yet (e.g. uploaded after the last server restart).
        for (const post of ownAudioPosts) {
          try {
            const { data: created } = await api.post(`/tracks/from-post/${post.id}`, {});
            tracks = [...tracks, created];
          } catch {
            // ignore — the post will simply not appear as a track this session
          }
        }

        if (cancelled) return;
        setMyTracks(tracks);

        const migratedPersonal = await migrateLegacyLocalStorage(personalRes.data);
        if (cancelled) return;
        setPersonalPlaylistLocal(migratedPersonal);

        if (user?.username && RADIO_CURATORS.has(user.username)) {
          const { data: radio } = await api.get('/playlists/chaplin-radio');
          if (cancelled) return;
          if (radio.id) {
            setChaplinPlaylistLocal(radio);
          } else {
            // No curated playlist exists yet anywhere — bootstrap it once.
            const { data: created } = await api.post('/playlists/', {
              name: 'Chaplin Radio',
              kind: 'chaplin_radio',
              visibility: 'public'
            });
            if (!cancelled) setChaplinPlaylistLocal(created);
          }
        }
      } catch {
        if (!cancelled) setMyTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (user?.id) {
      load();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const personalSelected = useMemo(
    () => new Set((personalPlaylist?.tracks || []).map((t) => t.id)),
    [personalPlaylist]
  );

  const chaplinSelected = useMemo(
    () => new Set((chaplinPlaylist?.tracks || []).map((t) => t.id)),
    [chaplinPlaylist]
  );

  const togglePersonal = async (track) => {
    if (!personalPlaylist || busyTrackId) return;
    setBusyTrackId(track.id);
    try {
      const selected = personalSelected.has(track.id);
      const { data } = selected
        ? await api.delete(`/playlists/${personalPlaylist.id}/items/${track.id}`)
        : await api.post(`/playlists/${personalPlaylist.id}/items`, { track_id: track.id });
      setPersonalPlaylistLocal(data); window.dispatchEvent(new CustomEvent('chaplin-playlist-updated', { detail: { kind: 'personal', tracks: data.tracks || [] } }));
    } finally {
      setBusyTrackId(null);
    }
  };

  const toggleChaplin = async (track) => {
    if (!chaplinPlaylist || busyTrackId) return;
    setBusyTrackId(track.id);
    try {
      const selected = chaplinSelected.has(track.id);
      const { data } = selected
        ? await api.delete(`/playlists/${chaplinPlaylist.id}/items/${track.id}`)
        : await api.post(`/playlists/${chaplinPlaylist.id}/items`, { track_id: track.id });
      setChaplinPlaylistLocal(data); window.dispatchEvent(new CustomEvent('chaplin-playlist-updated', { detail: { kind: 'radio', tracks: data.tracks || [] } }));
    } finally {
      setBusyTrackId(null);
    }
  };

  return (
    <Card $cardBg={cardBg} $borderColor={borderColor} $shape={cardShape} $material={material} $cardFrame={cardFrame} $cardShadow={cardShadow}>
      <CardTitle $accentColor={accentColor}>
        <Music size={15} />
        Listas de reproduccion
      </CardTitle>

      <Hint $textColor={textColor}>
        Tu lista personal pertenece a tu perfil — cualquiera que lo visite puede reproducirla, sin depender de este navegador.
      </Hint>

      <GroupTitle $textColor={textColor}>Mi lista personal</GroupTitle>
      {loading && <Empty $borderColor={borderColor} $textColor={textColor} $widgetShape={widgetShape}>Cargando canciones...</Empty>}
      {!loading && myTracks.length === 0 && (
        <Empty $borderColor={borderColor} $textColor={textColor} $widgetShape={widgetShape}>
          No tienes canciones propias publicadas todavia.
        </Empty>
      )}
      {!loading && myTracks.length > 0 && (
        <TrackList>
          {myTracks.map((track) => {
            const selected = personalSelected.has(track.id);
            return (
              <TrackItem key={`personal-${track.id}`} $accentColor={accentColor} $widgetShape={widgetShape}>
                <TrackInfo>
                  <TrackName $textColor={textColor}>{track.title}</TrackName>
                  <TrackMeta $textColor={textColor}>@{track.owner_username}</TrackMeta>
                </TrackInfo>
                <SelectBtn
                  type="button"
                  $selected={selected}
                  $accentColor={accentColor}
                  $textColor={textColor}
                  $widgetShape={widgetShape}
                  disabled={busyTrackId === track.id || !personalPlaylist}
                  onClick={() => togglePersonal(track)}
                >
                  {selected ? <Check size={13} /> : <Plus size={13} />}
                  {selected ? 'En lista' : 'Agregar'}
                </SelectBtn>
              </TrackItem>
            );
          })}
        </TrackList>
      )}

      {isCurator && (
        <>
          <GroupTitle $textColor={textColor}>
            <Radio size={13} style={{ marginRight: 6 }} />
            Programacion Radio Chaplin
          </GroupTitle>
          <Hint $textColor={textColor}>
            Como curador defines aqui que canciones forman la emisora global de Chaplin.
          </Hint>

          {myTracks.length === 0 ? (
            <Empty $borderColor={borderColor} $textColor={textColor} $widgetShape={widgetShape}>
              Publica audios para programar la emisora.
            </Empty>
          ) : (
            <TrackList>
              {myTracks.map((track) => {
                const selected = chaplinSelected.has(track.id);
                return (
                  <TrackItem key={`chaplin-${track.id}`} $accentColor={accentColor} $widgetShape={widgetShape}>
                    <TrackInfo>
                      <TrackName $textColor={textColor}>{track.title}</TrackName>
                      <TrackMeta $textColor={textColor}>@{track.owner_username}</TrackMeta>
                    </TrackInfo>
                    <SelectBtn
                      type="button"
                      $selected={selected}
                      $accentColor={accentColor}
                      $textColor={textColor}
                      $widgetShape={widgetShape}
                      disabled={busyTrackId === track.id || !chaplinPlaylist}
                      onClick={() => toggleChaplin(track)}
                    >
                      {selected ? <Check size={13} /> : <Plus size={13} />}
                      {selected ? 'En radio' : 'Emitir'}
                    </SelectBtn>
                  </TrackItem>
                );
              })}
            </TrackList>
          )}
        </>
      )}
    </Card>
  );
}
