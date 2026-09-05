import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useSkin } from '../context/SkinContext';
import { Mail, MapPin, Link as LinkIcon, Calendar, Music, Settings as SettingsIcon } from 'lucide-react';
import ProfilePlaylistCard from './ProfilePlaylistCard';
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
    opacity: calc(0.08 + var(--material-intensity, .72) * .82);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => resolveCardTexture(props.$material)};
    opacity: calc(0.04 + var(--material-intensity, .72) * .46);
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
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${props => props.$accentColor};
`;

const InfoItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 14px;
  color: ${props => props.$textColor};

  &:last-child {
    margin-bottom: 0;
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${props => props.$accentColor};
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const InfoText = styled.span`
  word-break: break-word;
  line-height: 1.4;
`;

const LinkList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LinkButton = styled.button`
  padding: 12px 16px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: ${props => props.$accentColor}15;
  border: 1px solid ${props => props.$accentColor}40;
  color: ${props => props.$accentColor};
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: ${props => props.$accentColor}25;
    border-color: ${props => props.$accentColor}80;
    transform: translateY(-2px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Tag = styled.span`
  padding: 6px 12px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: ${props => props.$accentColor}20;
  border: 1px solid ${props => props.$accentColor}40;
  color: ${props => props.$accentColor};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`;

const GlowBar = styled.div`
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, ${props => props.$accentColor}, ${props => props.$accentColor}00);
  opacity: 0.4;
`;

const ProfileSidebarLeftComponent = ({ user, isOwnProfile }) => {
  const { skinData, appTheme } = useSkin();
  const navigate = useNavigate();

  const cardBg = appTheme.card?.bg || 'rgba(255,255,255,0.05)';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.1)';
  const accentColor = skinData?.accent || '#ff00ff';
  const textColor = appTheme.colors?.text || '#fff';
  const leftOrder = appTheme.profile?.leftOrder || ['contact', 'genres', 'actions', 'background', 'playlist'];
  const cardRadius = appTheme.card?.radius || '20px';
  const cardPadding = appTheme.card?.padding || '24px';
  const cardFrame = appTheme.card?.frame || 'solid';
  const cardShadow = appTheme.card?.shadow || '0 8px 32px rgba(0,0,0,0.3)';
  const cardShape = appTheme.card?.shape || 'rounded';
  const widgetShape = appTheme.card?.widgetShape || 'rounded';
  const material = appTheme.card?.material || 'glass';

  const renderCard = (sectionId) => {
    if (sectionId === 'contact') {
      return (
        <Card key="contact" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
          <CardTitle $accentColor={accentColor}>Contacto</CardTitle>
          {isOwnProfile && (
            // The public profile API never returns another user's email (backend
            // privacy whitelist) — only render this row when it's the owner's own
            // authenticated `user`, and never fall back to a fake-looking address.
            <InfoItem $textColor={textColor} $accentColor={accentColor}>
              <Mail />
              <InfoText>{user?.email}</InfoText>
            </InfoItem>
          )}
          <InfoItem $textColor={textColor} $accentColor={accentColor}>
            <MapPin />
            <InfoText>Madrid, España</InfoText>
          </InfoItem>
          <InfoItem $textColor={textColor} $accentColor={accentColor}>
            <Calendar />
            <InfoText>Se unió {new Date().toLocaleDateString('es-ES')}</InfoText>
          </InfoItem>
        </Card>
      );
    }

    if (sectionId === 'genres') {
      return (
        <Card key="genres" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
          <GlowBar $accentColor={accentColor} />
          <CardTitle $accentColor={accentColor}>
            <Music size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Géneros
          </CardTitle>
          <TagContainer>
            <Tag $accentColor={accentColor} $widgetShape={widgetShape}>Synthwave</Tag>
            <Tag $accentColor={accentColor} $widgetShape={widgetShape}>Vaporwave</Tag>
            <Tag $accentColor={accentColor} $widgetShape={widgetShape}>Electro</Tag>
            <Tag $accentColor={accentColor} $widgetShape={widgetShape}>Cyberpunk</Tag>
            <Tag $accentColor={accentColor} $widgetShape={widgetShape}>Chillwave</Tag>
          </TagContainer>
        </Card>
      );
    }

    if (sectionId === 'actions') {
      // Editing controls only make sense on your own profile — showing them
      // while visiting someone else's would edit YOUR OWN settings, not theirs.
      if (!isOwnProfile) {
        return (
          <Card key="actions" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
            <CardTitle $accentColor={accentColor}>Acciones</CardTitle>
            <LinkList>
              <LinkButton type="button" onClick={() => navigate('/inbox', { state: { startWith: user?.username } })} $accentColor={accentColor} $widgetShape={widgetShape}>
                Enviar mensaje
              </LinkButton>
            </LinkList>
          </Card>
        );
      }
      return (
        <Card key="actions" $cardBg={cardBg} $borderColor={borderColor} $accentColor={accentColor} $cardRadius={cardRadius} $cardPadding={cardPadding} $cardFrame={cardFrame} $cardShadow={cardShadow} $shape={cardShape} $material={material}>
          <CardTitle $accentColor={accentColor}>Acciones</CardTitle>
          <LinkList>
            <LinkButton type="button" onClick={() => navigate('/settings')} $accentColor={accentColor} $widgetShape={widgetShape}>
              <SettingsIcon size={16} />
              Configuración
            </LinkButton>
          </LinkList>
        </Card>
      );
    }

    if (sectionId === 'background') {
      // Moved to Configuración → Fondos, so it no longer clutters the profile.
      return null;
    }

    if (sectionId === 'playlist') {
      return <ProfilePlaylistCard key="playlist" />;
    }

    return null;
  };

  return (
    <SidebarWrapper>
      {leftOrder.map((sectionId) => renderCard(sectionId))}
    </SidebarWrapper>
  );
};

const ProfileSidebarLeft = React.memo(ProfileSidebarLeftComponent);

export default ProfileSidebarLeft;
