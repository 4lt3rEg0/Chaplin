import React from 'react';
import styled from 'styled-components';
import { useSkin } from '../context/SkinContext';
import { Heart, MessageCircle, Share2, Play } from 'lucide-react';
import {
  resolveCardTexture,
  resolveMaterialOverlay,
  resolveShapeClipPath,
  resolveShapeRadius,
  resolveWidgetRadius
} from '../styles/hudTokens';

const FeedWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FeedCard = styled.div.attrs((props) => ({ 'data-shape': props.$shape || 'rounded' }))`
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
    opacity: calc(0.1 + var(--material-intensity, .72) * .86);
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
`;

const CardContent = styled.div`
  position: relative;
  z-index: 1;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.$borderColor};
`;

const CardAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.$accentColor}, ${props => props.$accentColor}66);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
`;

const CardMeta = styled.div`
  flex: 1;
`;

const CardName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$textColor};
`;

const CardTime = styled.div`
  font-size: 12px;
  color: ${props => props.$textColor}99;
  margin-top: 2px;
`;

const CardTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.$textColor};
  margin: 0 0 12px 0;
  line-height: 1.4;
`;

const CardDescription = styled.p`
  font-size: 14px;
  color: ${props => props.$textColor}dd;
  margin: 0 0 16px 0;
  line-height: 1.6;
`;

const MediaBox = styled.div`
  width: 100%;
  height: 180px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: linear-gradient(135deg, ${props => props.$accentColor}20, ${props => props.$accentColor}05);
  border: 1px solid ${props => props.$accentColor}30;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px 0;
  color: ${props => props.$accentColor};
  font-size: 48px;
  cursor: pointer;

  &:hover {
    background: linear-gradient(135deg, ${props => props.$accentColor}30, ${props => props.$accentColor}10);
  }
`;

const CardFooter = styled.div`
  display: flex;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.$borderColor};
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: ${props => props.$accentColor}15;
  color: ${props => props.$accentColor};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$accentColor}25;
    transform: translateY(-2px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProfileFeedComponent = ({ user }) => {
  const { skinData, appTheme } = useSkin();

  const cardBg = appTheme.card?.bg || 'rgba(255,255,255,0.05)';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.1)';
  const accentColor = skinData?.accent || '#ff00ff';
  const textColor = appTheme.colors?.text || '#fff';
  const cardRadius = appTheme.card?.radius || '20px';
  const cardPadding = appTheme.card?.padding || '28px';
  const cardFrame = appTheme.card?.frame || 'solid';
  const cardShadow = appTheme.card?.shadow || '0 8px 32px rgba(0,0,0,0.3)';
  const cardShape = appTheme.card?.shape || 'rounded';
  const widgetShape = appTheme.card?.widgetShape || 'rounded';
  const material = appTheme.card?.material || 'glass';

  const posts = [
    {
      id: 1,
      title: 'Nuevo track: Neon Dreams',
      description: 'Acabo de terminar este track de synthwave inspirado en las luces de neón del futuro. ¿Qué os parece?',
      type: 'audio',
      icon: '🎵',
      time: 'Hace 2 horas'
    },
    {
      id: 2,
      title: 'Sesión en vivo este viernes',
      description: 'Os anuncio que haré una sesión en vivo este viernes a las 22:00. Será un set especial de lo mejor de synthwave y vaporwave.',
      type: 'video',
      icon: '📹',
      time: 'Hace 5 horas'
    },
    {
      id: 3,
      title: 'Recomendación del día',
      description: 'He descubierto este artista increíble que mezcla cyberpunk con música clásica. Los resultados son... alucinantes.',
      type: 'text',
      icon: '💬',
      time: 'Ayer'
    }
  ];

  return (
    <FeedWrapper>
      {posts.map((post) => (
        <FeedCard
          key={post.id}
          $cardBg={cardBg}
          $borderColor={borderColor}
          $accentColor={accentColor}
          $cardRadius={cardRadius}
          $cardPadding={cardPadding}
          $cardFrame={cardFrame}
          $cardShadow={cardShadow}
          $shape={cardShape}
          $material={material}
        >
          <CardContent>
            <CardHeader $borderColor={borderColor}>
              <CardAvatar $accentColor={accentColor}>
                {post.icon}
              </CardAvatar>
              <CardMeta>
                <CardName $textColor={textColor}>
                  {user?.full_name || 'Usuario'}
                </CardName>
                <CardTime>{post.time}</CardTime>
              </CardMeta>
            </CardHeader>

            <CardTitle $textColor={textColor}>
              {post.title}
            </CardTitle>
            <CardDescription $textColor={textColor}>
              {post.description}
            </CardDescription>

            {post.type !== 'text' && (
              <MediaBox
                $accentColor={accentColor}
                $widgetShape={widgetShape}
              >
                {post.type === 'audio' ? '🎧' : '▶️'}
              </MediaBox>
            )}

            <CardFooter $borderColor={borderColor}>
              <ActionButton $accentColor={accentColor} $widgetShape={widgetShape}>
                <Heart size={16} />
                <span>Me gusta</span>
              </ActionButton>
              <ActionButton $accentColor={accentColor} $widgetShape={widgetShape}>
                <MessageCircle size={16} />
                <span>Comentar</span>
              </ActionButton>
              <ActionButton $accentColor={accentColor} $widgetShape={widgetShape}>
                <Share2 size={16} />
                <span>Compartir</span>
              </ActionButton>
            </CardFooter>
          </CardContent>
        </FeedCard>
      ))}
    </FeedWrapper>
  );
};

const ProfileFeed = React.memo(ProfileFeedComponent);

export default ProfileFeed;
