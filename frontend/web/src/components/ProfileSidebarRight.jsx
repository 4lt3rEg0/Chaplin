import React from 'react';
import styled from 'styled-components';
import { useSkin } from '../context/SkinContext';
import { UserPlus, Zap } from 'lucide-react';
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

const FriendButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: ${props => props.$accentColor};
  color: ${props => props.$cardBg};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
  grid-column: 2;
  justify-self: end;
  min-width: 34px;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px ${props => props.$accentColor}50;
  }
`;

const StatBox = styled.div`
  padding: 16px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: linear-gradient(135deg, ${props => props.$accentColor}15, ${props => props.$accentColor}05);
  border: 1px solid ${props => props.$accentColor}40;
  text-align: center;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.$accentColor};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$textColor}99;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.3;
  overflow-wrap: anywhere;
`;

const GlowBar = styled.div`
  height: 4px;
  background: linear-gradient(90deg, ${props => props.$accentColor}, ${props => props.$accentColor}00);
  border-radius: 2px;
  margin-bottom: 16px;
  opacity: 0.4;
`;

const ProfileSidebarRightComponent = ({ user }) => {
  const { skinData, appTheme } = useSkin();

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

  const friends = [
    { name: 'Alex Vibes', handle: '@alexvibes', icon: '🎨' },
    { name: 'Luna Echo', handle: '@lunaecho', icon: '🌙' },
    { name: 'Cyber Nova', handle: '@cybernova', icon: '⚡' },
    { name: 'Neon Soul', handle: '@neonsoul', icon: '💜' },
    { name: 'Synth Wave', handle: '@synthw4ve', icon: '🌀' },
  ];

  const renderCard = (sectionId) => {
    if (sectionId === 'friends') {
      return (
        <Card key="friends" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
          <CardTitle $accentColor={accentColor}>
            <UserPlus size={16} />
            Amigos
          </CardTitle>
          {friends.map((friend, idx) => (
            <FriendItem key={idx} $accentColor={accentColor} $widgetShape={widgetShape}>
              <FriendAvatar $accentColor={accentColor}>{friend.icon}</FriendAvatar>
              <FriendInfo>
                <FriendName $textColor={textColor}>{friend.name}</FriendName>
                <FriendHandle $textColor={textColor}>{friend.handle}</FriendHandle>
              </FriendInfo>
              <FriendButton $accentColor={accentColor} $cardBg={cardBg} $widgetShape={widgetShape}>+</FriendButton>
            </FriendItem>
          ))}
        </Card>
      );
    }

    if (sectionId === 'stats') {
      return (
        <Card key="stats" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
          <GlowBar $accentColor={accentColor} />
          <CardTitle $accentColor={accentColor}>
            <Zap size={16} />
            Estadísticas
          </CardTitle>
          <StatBox $accentColor={accentColor} $widgetShape={widgetShape}>
            <StatValue $accentColor={accentColor}>1.2K</StatValue>
            <StatLabel $textColor={textColor}>Reproducciones</StatLabel>
          </StatBox>
          <StatBox $accentColor={accentColor} $widgetShape={widgetShape}>
            <StatValue $accentColor={accentColor}>847</StatValue>
            <StatLabel $textColor={textColor}>Me gusta recibidos</StatLabel>
          </StatBox>
          <StatBox $accentColor={accentColor} $widgetShape={widgetShape}>
            <StatValue $accentColor={accentColor}>156</StatValue>
            <StatLabel $textColor={textColor}>Compartidos</StatLabel>
          </StatBox>
          <StatBox $accentColor={accentColor} $widgetShape={widgetShape}>
            <StatValue $accentColor={accentColor}>92%</StatValue>
            <StatLabel $textColor={textColor}>Tasa de engagement</StatLabel>
          </StatBox>
        </Card>
      );
    }

    return null;
  };

  return <SidebarWrapper>{rightOrder.map((sectionId) => renderCard(sectionId))}</SidebarWrapper>;
};

const ProfileSidebarRight = React.memo(ProfileSidebarRightComponent);

export default ProfileSidebarRight;
