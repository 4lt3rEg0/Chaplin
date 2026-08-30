import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useSkin } from '../context/SkinContext';
import { UserPlus } from 'lucide-react';
import api from '../services/api';
import {
  resolveCardTexture,
  resolveMaterialOverlay,
  resolveShapeClipPath,
  resolveShapeRadius,
  resolveWidgetRadius
} from '../styles/hudTokens';

const SidebarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div.attrs((props) => ({ 'data-shape': props.$shape || 'rounded' }))`
  padding: var(--card-inset-y) var(--card-inset-x);
  min-width: 0;
  min-height: var(--card-min-height);
  border-radius: ${props => resolveShapeRadius(props.$shape, props.$cardRadius || '20px')};
  clip-path: ${props => resolveShapeClipPath(props.$shape)};
  background: ${props => props.$cardBg};
  border: 1px ${props => props.$cardFrame || 'solid'} ${props => props.$borderColor};
  backdrop-filter: none;
  box-shadow: ${props => props.$cardShadow || '0 8px 32px rgba(0, 0, 0, 0.3)'};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => resolveMaterialOverlay(props.$material)};
    opacity: calc(0.08 + var(--material-intensity, .72) * .84);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => resolveCardTexture(props.$material)};
    opacity: calc(0.04 + var(--material-intensity, .72) * .44);
    pointer-events: none;
  }

  &:hover {
    border-color: ${props => props.$accentColor};
    box-shadow: 0 12px 40px ${props => props.$accentColor}30;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 18px 0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${props => props.$accentColor};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FollowButtonTop = styled.button`
  padding: 8px 14px;
  border: 1px solid ${props => props.$accentColor};
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: ${props => (props.$active ? props.$accentColor : 'transparent')};
  color: ${props => (props.$active ? props.$cardBg : props.$accentColor)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  margin-bottom: 16px;
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FriendItem = styled.div`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  margin-bottom: 12px;
  background: ${props => props.$accentColor}08;
  transition: background-color 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${props => props.$accentColor}15;
    transform: translateX(4px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const FriendAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.$accentColor}, ${props => props.$accentColor}66);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
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
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3ddc84;
  border: 2px solid ${props => props.$cardBg};
`;

const FriendInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FriendName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$textColor};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FriendHandle = styled.div`
  font-size: 11px;
  color: ${props => props.$textColor}99;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.25;
`;

const EmptyFriends = styled.p`
  font-size: 12px;
  color: ${props => props.$textColor}80;
  margin: 0;
  text-align: center;
`;


const ProfileSidebarRightComponent = ({ user, isOwnProfile }) => {
  const { skinData, appTheme } = useSkin();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(Boolean(user?.is_following));
  const [followerCount, setFollowerCount] = useState(user?.follower_count || 0);
  const [followSaving, setFollowSaving] = useState(false);
  const [followersList, setFollowersList] = useState([]);

  useEffect(() => {
    setFollowing(Boolean(user?.is_following));
    setFollowerCount(user?.follower_count || 0);
  }, [user?.is_following, user?.follower_count]);

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/users/${user.username}/followers`)
      .then(({ data }) => setFollowersList(data.slice(0, 5)))
      .catch(() => setFollowersList([]));
  }, [user?.username]);

  const cardBg = appTheme.card?.bg || 'rgba(255,255,255,0.05)';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.1)';
  const accentColor = skinData?.accent || '#ff00ff';
  const textColor = appTheme.colors?.text || '#fff';
  const rightOrder = appTheme.profile?.rightOrder || ['friends', 'stats'];
  const cardRadius = appTheme.card?.radius || '20px';
  const cardPadding = appTheme.card?.padding || '24px';
  const cardFrame = appTheme.card?.frame || 'solid';
  const cardShadow = appTheme.card?.shadow || '0 8px 32px rgba(0,0,0,0.3)';
  const cardShape = appTheme.card?.shape || 'rounded';
  const widgetShape = appTheme.card?.widgetShape || 'rounded';
  const material = appTheme.card?.material || 'glass';

  const toggleFollow = async () => {
    if (!user?.username || followSaving) return;
    setFollowSaving(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowerCount((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));
    try {
      const { data } = await api.post(`/users/${user.username}/follow`);
      setFollowing(data.is_following);
      setFollowerCount(data.follower_count);
    } catch {
      setFollowing(wasFollowing);
      setFollowerCount((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
    } finally {
      setFollowSaving(false);
    }
  };

  const renderCard = (sectionId) => {
    if (sectionId === 'friends') {
      return (
        <Card key="friends" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
          <CardTitle $accentColor={accentColor}>
            <UserPlus size={16} />
            Seguidores
          </CardTitle>
          {!isOwnProfile && (
            <FollowButtonTop
              type="button"
              onClick={toggleFollow}
              disabled={followSaving}
              $active={following}
              $accentColor={accentColor}
              $cardBg={cardBg}
              $widgetShape={widgetShape}
            >
              {followSaving ? 'Guardando...' : following ? 'Siguiendo' : 'Seguir'}
            </FollowButtonTop>
          )}
          {followersList.length === 0 ? (
            <EmptyFriends $textColor={textColor}>
              {isOwnProfile ? 'Todavía no tienes seguidores.' : 'Sin seguidores todavía.'}
            </EmptyFriends>
          ) : (
            followersList.map((f) => (
              <FriendItem
                key={f.id}
                $accentColor={accentColor}
                $widgetShape={widgetShape}
                onClick={() => navigate(`/profile/${f.username}`)}
              >
                <FriendAvatar $accentColor={accentColor}>
                  {f.avatar_url ? <img src={f.avatar_url} alt="" /> : f.username[0]?.toUpperCase()}
                  {f.is_online && <OnlineDot $cardBg={cardBg} />}
                </FriendAvatar>
                <FriendInfo>
                  <FriendName $textColor={textColor}>{f.first_name} {f.last_name}</FriendName>
                  <FriendHandle $textColor={textColor}>@{f.username}{f.is_online ? ' · en línea' : ''}</FriendHandle>
                </FriendInfo>
              </FriendItem>
            ))
          )}
        </Card>
      );
    }

    // 'stats' intentionally renders nothing now — the same follower/following
    // counts moved to ProfileHeader (Instagram-style, next to the avatar)
    // instead of duplicating them in a second card here.
    if (sectionId === 'stats') {
      return null;
    }

    return null;
  };

  return <SidebarWrapper>{rightOrder.map((sectionId) => renderCard(sectionId))}</SidebarWrapper>;
};

const ProfileSidebarRight = React.memo(ProfileSidebarRightComponent);

export default ProfileSidebarRight;
