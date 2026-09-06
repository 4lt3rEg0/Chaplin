import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { useSkin } from '../context/SkinContext';
import { useVortex } from '../context/VortexContext';
import api, { uploadAvatar } from '../services/api';

import ProfileHeader from '../components/ProfileHeader';
import ProfilePlayer from '../components/ProfilePlayer/ProfilePlayer';
import ProfileSidebarLeft from '../components/ProfileSidebarLeft';
import ProfileTabs from '../components/ProfileTabs';
import ProfileSidebarRight from '../components/ProfileSidebarRight';

const PageWrapper = styled.div`
  position: relative;
  background: transparent;
  color: ${props => props.$textColor};
  transition: background 0.4s ease, color 0.3s ease;
  overflow-x: hidden;
`;

const Container = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-areas: ${({ $layoutTemplate }) => {
    if ($layoutTemplate === 'collector') return '"hero hero right" "left feed right"';
    if ($layoutTemplate === 'editorial') return '"hero hero right" "feed feed left"';
    if ($layoutTemplate === 'comic') return '"hero right right" "left feed feed"';
    if ($layoutTemplate === 'organic' || $layoutTemplate === 'arcade') return '"hero hero hero" "left feed right"';
    if ($layoutTemplate === 'shrine') return '". hero ." "left feed right"';
    if ($layoutTemplate === 'gallery') return '"hero hero" "feed right" "feed left"';
    if ($layoutTemplate === 'constellation') return '"left hero right" ". feed ."';
    return '"left hero right" "left feed right"';
  }};
  grid-template-columns: ${({ $layoutTemplate }) => {
    if ($layoutTemplate === 'collector') return '320px minmax(0, 1fr) 280px';
    if ($layoutTemplate === 'studio') return '220px minmax(0, 1fr) 360px';
    if ($layoutTemplate === 'editorial') return 'minmax(0, 1fr) minmax(0, 1fr) 280px';
    if ($layoutTemplate === 'comic') return '300px minmax(0, 1fr) 280px';
    if ($layoutTemplate === 'terminal') return '260px minmax(0, 1fr) 300px';
    if ($layoutTemplate === 'organic') return '260px minmax(0, 1fr) 260px';
    if ($layoutTemplate === 'shrine') return '220px minmax(420px, 1fr) 220px';
    if ($layoutTemplate === 'gallery') return 'minmax(0, 1fr) 260px';
    if ($layoutTemplate === 'arcade') return '300px minmax(0, 1fr) 300px';
    if ($layoutTemplate === 'edge') return '230px minmax(0, 1fr) 250px';
    if ($layoutTemplate === 'constellation') return '250px minmax(0, 1fr) 250px';
    return '280px minmax(0, 1fr) 300px';
  }};
  gap: var(--layout-gap, 24px);
  align-items: start;

  ${({ $layoutTemplate }) => $layoutTemplate === 'constellation' && `
    column-gap: 42px;
    > [data-profile-rail] { margin-top: 44px; }
  `}

  ${({ $layoutTemplate }) => $layoutTemplate === 'edge' && `
    > [data-profile-rail] { position: sticky; top: 130px; }
  `}

  ${({ $layoutTemplate }) => $layoutTemplate === 'gallery' && `
    row-gap: 48px;
  `}

  @media (max-width: 1180px) and (min-width: 1025px) {
    grid-template-columns: minmax(560px, 1fr) minmax(260px, 300px);
    grid-template-areas: ${({ $layoutTemplate }) => {
      if (['collector', 'edge', 'studio', 'arcade'].includes($layoutTemplate)) return '"hero right" "feed right"';
      return '"hero hero" "feed right"';
    }};

    > [data-profile-rail="left"] { display: none; }
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-areas: ${({ $layoutTemplate }) => {
      if ($layoutTemplate === 'edge') return '"hero" "right" "feed" "left"';
      if ($layoutTemplate === 'collector') return '"hero" "right" "feed" "left"';
      if ($layoutTemplate === 'studio') return '"hero" "right" "left" "feed"';
      if ($layoutTemplate === 'editorial') return '"hero" "feed" "right" "left"';
      if ($layoutTemplate === 'comic') return '"hero" "left" "feed" "right"';
      if ($layoutTemplate === 'terminal') return '"hero" "left" "right" "feed"';
      if ($layoutTemplate === 'arcade') return '"hero" "right" "feed" "left"';
      return '"hero" "feed" "left" "right"';
    }};
    gap: 20px;

    > [data-profile-rail] { position: static; margin-top: 0; }
  }

  @media (max-width: 640px) {
    gap: 16px;
  }
`;

const LeftArea = styled.div`
  grid-area: left;
  min-width: 0;

  @media (min-width: 1181px) {
    position: sticky;
    top: calc(124px + var(--chaplin-player-panel-offset, 0px));
    max-height: max(128px, calc(100dvh - 470px - var(--chaplin-player-panel-offset, 0px) - var(--safe-bottom)));
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }
`;

const HeroArea = styled.div`
  grid-area: hero;
  min-width: 0;
`;

const FeedArea = styled.div`
  grid-area: feed;
  min-width: 0;
`;

const RightArea = styled.div`
  grid-area: right;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;

  @media (min-width: 1181px) {
    position: sticky;
    top: calc(124px + var(--chaplin-player-panel-offset, 0px));
    max-height: max(128px, calc(100dvh - 470px - var(--chaplin-player-panel-offset, 0px) - var(--safe-bottom)));
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }
`;

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { username: routeUsername } = useParams();
  const { skinData, appTheme, setProfileOverride: setSkinOverride } = useSkin();
  const { setProfileOverride: setVortexOverride } = useVortex();

  const [viewedUser, setViewedUser] = useState(null);
  const [viewedUserError, setViewedUserError] = useState(false);

  const isOwnProfile = !routeUsername || (user && routeUsername === user.username);

  // Profile Owner Environment: when visiting someone else's public profile,
  // fetch their user record + whitelisted public environment and apply it as a
  // temporary override on top of the visitor's own base Skin/Vortex state.
  // Leaving the profile (unmount, or navigating to a different username) always
  // restores the visitor's base environment automatically.
  useEffect(() => {
    if (isOwnProfile) {
      setViewedUser(null);
      setViewedUserError(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    setViewedUser(null);
    setViewedUserError(false);

    const loadOwnerProfile = async () => {
      try {
        const { data: ownerUser } = await api.get(
          `/users/by-username/${encodeURIComponent(routeUsername)}`,
          { signal: controller.signal }
        );
        if (cancelled) return;
        setViewedUser(ownerUser);

        try {
          const { data: environment } = await api.get(
            `/users/${ownerUser.id}/environment`,
            { signal: controller.signal }
          );
          if (cancelled) return;
          if (environment?.theme) setSkinOverride(environment.theme);
          if (environment?.background) setVortexOverride(environment.background);
        } catch {
          // Environment fetch failed — still show the owner's profile using the
          // visitor's own base environment rather than breaking the page.
        }
      } catch {
        if (!cancelled) setViewedUserError(true);
      }
    };

    loadOwnerProfile();

    return () => {
      cancelled = true;
      controller.abort();
      // Leaving this profile (unmount or routeUsername change) always restores
      // the visitor's own base environment.
      setSkinOverride(null);
      setVortexOverride(null);
    };
  }, [isOwnProfile, routeUsername, setSkinOverride, setVortexOverride]);

  const displayUser = isOwnProfile ? user : viewedUser;

  const handleAvatarUpload = async (file) => {
    try {
      await uploadAvatar(file);
      await refreshUser();
    } catch {
      window.alert('No se pudo subir la foto de perfil. Inténtalo de nuevo.');
    }
  };

  const handlePresenceChange = async (presenceStatus) => {
    try {
      const formData = new FormData();
      formData.append('presence_status', presenceStatus);
      await api.put('/users/me', formData);
      await refreshUser();
    } catch {
      window.alert('No se pudo actualizar tu estado. Inténtalo de nuevo.');
    }
  };

  if (!user) {
    return (
      <PageWrapper className="chaplin-page-frame" $bgColor={appTheme.colors.background} $textColor={appTheme.colors.text}>
        <Container className="chaplin-page-shell">
          <div style={{ gridColumn: '1/-1', textAlign: 'center', marginTop: '100px' }}>
            <h2>Cargando perfil...</h2>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  if (!isOwnProfile && viewedUserError) {
    return (
      <PageWrapper className="chaplin-page-frame" $bgColor={appTheme.colors.background} $textColor={appTheme.colors.text}>
        <Container className="chaplin-page-shell">
          <div style={{ gridColumn: '1/-1', textAlign: 'center', marginTop: '100px' }}>
            <h2>Este perfil no existe o no es público</h2>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  if (!isOwnProfile && !displayUser) {
    return (
      <PageWrapper className="chaplin-page-frame" $bgColor={appTheme.colors.background} $textColor={appTheme.colors.text}>
        <Container className="chaplin-page-shell">
          <div style={{ gridColumn: '1/-1', textAlign: 'center', marginTop: '100px' }}>
            <h2>Cargando perfil...</h2>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  const bgColor = skinData?.background || appTheme.colors.background;
  const textColor = appTheme.colors.text;
  const layoutTemplate = appTheme.profile?.layoutTemplate || 'classic';

  return (
    <PageWrapper
      className="chaplin-page-frame"
      $bgColor={bgColor}
      $textColor={textColor}
    >
      <Container className="chaplin-page-shell" $layoutTemplate={layoutTemplate}>
        <LeftArea data-profile-rail="left">
          <ProfileSidebarLeft user={displayUser} isOwnProfile={isOwnProfile} />
        </LeftArea>
        <HeroArea>
          <ProfileHeader
            user={displayUser}
            editable={isOwnProfile}
            onPhotoChange={isOwnProfile ? handleAvatarUpload : null}
            onPresenceChange={isOwnProfile ? handlePresenceChange : null}
          />
          <ProfilePlayer username={displayUser.username} avatarUrl={displayUser.avatar_url} />
        </HeroArea>
        <FeedArea>
          <ProfileTabs user={displayUser} isOwnProfile={isOwnProfile} />
        </FeedArea>
        <RightArea data-profile-rail="right">
          <ProfileSidebarRight user={displayUser} isOwnProfile={isOwnProfile} />
        </RightArea>
      </Container>
    </PageWrapper>
  );
};

export default ProfilePage;
