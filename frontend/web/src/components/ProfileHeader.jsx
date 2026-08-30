import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useSkin } from '../context/SkinContext';
import { Camera } from 'lucide-react';
import {
  resolveCardTexture,
  resolveMaterialOverlay,
  resolveShapeClipPath,
  resolveShapeRadius,
  resolveWidgetRadius
} from '../styles/hudTokens';

const HeaderWrapper = styled.div.attrs((props) => ({ 'data-shape': props.$shape || 'rounded' }))`
  padding: var(--card-inset-y) var(--card-inset-x);
  min-width: 0;
  min-height: var(--card-min-height);
  border-radius: ${props => resolveShapeRadius(props.$shape, props.$cardRadius || '24px')};
  clip-path: ${props => resolveShapeClipPath(props.$shape)};
  background: ${props => props.$cardBg};
  border: 1px ${props => props.$cardFrame || 'solid'} ${props => props.$borderColor};
  backdrop-filter: none;
  box-shadow: ${props => props.$cardShadow || '0 8px 32px rgba(0, 0, 0, 0.3)'};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => resolveMaterialOverlay(props.$material)};
    opacity: calc(0.12 + var(--material-intensity, .72) * 1.02);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => resolveCardTexture(props.$material)};
    opacity: calc(0.06 + var(--material-intensity, .72) * .5);
    pointer-events: none;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 32px;
  align-items: flex-start;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 20px;
    align-items: center;
  }
`;

const Avatar = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.$accentColor}, ${props => props.$accentColor}66);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 8px 24px ${props => props.$accentColor}40;
  position: relative;

  @media (max-width: 640px) {
    width: 120px;
    height: 120px;
    font-size: 48px;
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const CameraButton = styled.button`
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 34px;
  height: 34px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  border: 1px solid ${props => props.$accentColor};
  background: rgba(5, 8, 14, 0.85);
  color: ${props => props.$accentColor};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 12px ${props => props.$accentColor}55;

  &:hover {
    transform: scale(1.06);
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Name = styled.h1`
  font-size: 36px;
  font-weight: 800;
  margin: 0;
  color: ${props => props.$textColor};
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow-wrap: anywhere;
  line-height: 1.25;
  padding-block: 0.06em;

  @media (max-width: 640px) {
    font-size: 28px;
    text-align: center;
  }
`;

const Handle = styled.p`
  font-size: 16px;
  color: ${props => props.$textColor}99;
  margin: 0;
  font-weight: 500;

  @media (max-width: 640px) {
    text-align: center;
  }
`;

const STATUS_META = {
  online: { label: 'Activo en Chaplin', color: '#3ddc84', pulse: true },
  away: { label: 'Ausente', color: '#f5a623', pulse: false },
  offline: { label: 'Desconectado', color: 'rgba(255,255,255,0.45)', pulse: false }
};

const Status = styled.div`
  padding: 8px 16px;
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  background: ${props => props.$dotColor}18;
  border: 1px solid ${props => props.$dotColor};
  color: ${props => props.$textColor};
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.$dotColor};
    animation: ${props => props.$pulse ? 'pulse 2s ease-in-out infinite' : 'none'};
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @media (max-width: 640px) {
    justify-content: center;
  }
`;

const StatusSelect = styled.select`
  border: 1px solid ${props => props.$dotColor};
  background: ${props => props.$dotColor}18;
  color: ${props => props.$textColor};
  border-radius: ${props => resolveWidgetRadius(props.$widgetShape)};
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  cursor: pointer;
`;

const Stats = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.$borderColor};

  @media (max-width: 640px) {
    justify-content: center;
    gap: 16px;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.$accentColor};
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.$textColor}99;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProfileHeaderComponent = ({ user, editable = false, onPhotoChange = null, onPresenceChange = null }) => {
  const { skinData, appTheme } = useSkin();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [presenceSaving, setPresenceSaving] = useState(false);

  const cardBg = appTheme.card?.bg || 'rgba(255,255,255,0.05)';
  const borderColor = appTheme.card?.border || 'rgba(255,255,255,0.1)';
  const accentColor = skinData?.accent || '#ff00ff';
  const textColor = appTheme.colors?.text || '#fff';
  const cardShape = appTheme.card?.shape || 'rounded';
  const widgetShape = appTheme.card?.widgetShape || 'rounded';
  const material = appTheme.card?.material || 'glass';
  const cardRadius = appTheme.card?.radius || '24px';
  const cardFrame = appTheme.card?.frame || 'solid';
  const cardShadow = appTheme.card?.shadow || '0 8px 32px rgba(0, 0, 0, 0.3)';

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : '👤';

  const openPhotoPicker = () => {
    if (!editable || uploading) return;
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onPhotoChange) return;

    setUploading(true);
    try {
      await onPhotoChange(file);
    } finally {
      setUploading(false);
    }
  };

  const handlePresenceSelect = async (event) => {
    const next = event.target.value;
    if (!onPresenceChange || presenceSaving) return;
    setPresenceSaving(true);
    try {
      await onPresenceChange(next);
    } finally {
      setPresenceSaving(false);
    }
  };

  const currentStatus = STATUS_META[user?.status] || STATUS_META.offline;

  return (
    <HeaderWrapper
      id="profile-header-card"
      $cardBg={cardBg}
      $borderColor={borderColor}
      $accentColor={accentColor}
      $shape={cardShape}
      $material={material}
      $cardRadius={cardRadius}
      $cardFrame={cardFrame}
      $cardShadow={cardShadow}
    >
      <Content>
        <Avatar
          $accentColor={accentColor}
        >
          {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt="Foto de perfil" /> : initials}
          {editable && (
            <>
              <CameraButton
                type="button"
                onClick={openPhotoPicker}
                $accentColor={accentColor}
                $widgetShape={widgetShape}
                title="Cambiar foto"
                disabled={uploading}
              >
                <Camera size={16} />
              </CameraButton>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
              />
            </>
          )}
        </Avatar>
        <Info>
          <Name $textColor={textColor}>
            {fullName || 'Usuario'}
          </Name>
          <Handle $textColor={textColor}>
            @{user?.username || 'username'}
          </Handle>
          {editable && onPresenceChange ? (
            <StatusSelect
              $dotColor={currentStatus.color}
              $textColor={textColor}
              $widgetShape={widgetShape}
              value={user?.status && STATUS_META[user.status] ? user.status : 'online'}
              onChange={handlePresenceSelect}
              disabled={presenceSaving}
            >
              <option value="online">Activo en Chaplin</option>
              <option value="away">Ausente</option>
              <option value="invisible">Invisible (aparecer desconectado)</option>
            </StatusSelect>
          ) : (
            <Status $dotColor={currentStatus.color} $textColor={textColor} $pulse={currentStatus.pulse} $widgetShape={widgetShape}>
              {currentStatus.label}
            </Status>
          )}
          <Stats $borderColor={borderColor}>
            <StatItem>
              <StatNumber $accentColor={accentColor}>
                {user?.follower_count ?? 0}
              </StatNumber>
              <StatLabel $textColor={textColor}>Seguidores</StatLabel>
            </StatItem>
            <StatItem>
              <StatNumber $accentColor={accentColor}>
                {user?.following_count ?? 0}
              </StatNumber>
              <StatLabel $textColor={textColor}>Siguiendo</StatLabel>
            </StatItem>
            <StatItem>
              <StatNumber $accentColor={accentColor}>
                {user?.post_count ?? 0}
              </StatNumber>
              <StatLabel $textColor={textColor}>Posts</StatLabel>
            </StatItem>
          </Stats>
        </Info>
      </Content>
    </HeaderWrapper>
  );
};

const ProfileHeader = React.memo(ProfileHeaderComponent);

export default ProfileHeader;
