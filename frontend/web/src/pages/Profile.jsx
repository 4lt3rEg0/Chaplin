import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  User, Settings, Radio, Lock, Globe,
  Camera, Edit3, Music, Video, Image,
  Users, Mail, Calendar, LogOut, Clock, Heart, MessageCircle, Share2
} from 'lucide-react';
import { MemberSinceBadge } from '../components/CyberCoreUI';

const ProfileContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  color: #00ff88;
  padding: 20px;
  font-family: 'Courier New', monospace;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #00ff88;
  margin-bottom: 30px;
  background: rgba(20, 20, 30, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 15px;
`;

const Logo = styled.h1`
  font-family: 'Orbitron', monospace;
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 0 0 10px #00ff88;
  letter-spacing: 2px;
`;

const ProfileHeader = styled.div`
  display: flex;
  gap: 30px;
  align-items: center;
  margin-bottom: 40px;
  padding: 30px;
  background: rgba(20, 20, 30, 0.8);
  border-radius: 20px;
  border: 2px solid #00ff8866;
  backdrop-filter: blur(10px);
`;

const AvatarContainer = styled.div`
  position: relative;
`;

const Avatar = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: linear-gradient(45deg, #00ff88, #ff00ff, #0000ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
  font-family: 'Orbitron', monospace;
  font-weight: bold;
  border: 4px solid #00ff88;
  box-shadow: 0 0 50px rgba(0, 255, 136, 0.5);
`;

const AvatarEdit = styled.button`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00ff88;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #00ff88;

  &:hover {
    background: rgba(0, 255, 136, 0.2);
    transform: scale(1.1);
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const Username = styled.h2`
  font-family: 'Orbitron', monospace;
  font-size: 2rem;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserDetails = styled.div`
  color: #666;
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 10px 0;
  font-size: 0.9rem;
`;

const DetailItem = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Bio = styled.p`
  color: #aaa;
  margin: 15px 0;
  line-height: 1.6;
  font-family: 'Courier New', monospace;
`;

const SocialGoal = styled.div`
  color: #00ff88;
  font-family: 'Courier New', monospace;
  margin: 10px 0;
  padding: 10px;
  background: rgba(0, 255, 136, 0.1);
  border-radius: 8px;
  border-left: 3px solid #00ff88;
`;

const Stats = styled.div`
  display: flex;
  gap: 30px;
  margin-top: 20px;
`;

const Stat = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-family: 'Orbitron', monospace;
  font-size: 1.5rem;
  color: #00ff88;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-top: 5px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
`;

const Tab = styled.button`
  background: ${props => props.active ? 'rgba(0, 255, 136, 0.1)' : 'transparent'};
  border: none;
  color: ${props => props.active ? '#00ff88' : '#666'};
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Orbitron', monospace;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;

  &:hover {
    color: #00ff88;
    background: rgba(0, 255, 136, 0.05);
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 30px;
`;

const Sidebar = styled.div`
  background: rgba(20, 20, 30, 0.8);
  border-radius: 15px;
  padding: 20px;
  border: 2px solid #00ff8866;
  backdrop-filter: blur(10px);
`;

const SettingsSection = styled.div`
  margin-bottom: 30px;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #333;

  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #aaa;
`;

const Toggle = styled.div`
  position: relative;
  width: 50px;
  height: 25px;
  background: ${props => props.active ? '#00ff88' : '#333'};
  border-radius: 25px;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.active ? '27px' : '2px'};
    width: 21px;
    height: 21px;
    background: white;
    border-radius: 50%;
    transition: left 0.3s;
  }
`;

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const PostThumbnail = styled.div`
  background: rgba(20, 20, 30, 0.8);
  border: 2px solid #00ff8866;
  border-radius: 12px;
  padding: 15px;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    border-color: #00ff88;
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 255, 136, 0.2);
  }
`;

const MemberInfo = styled.div`
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  border-radius: 10px;
  padding: 15px;
  margin: 15px 0;
  font-family: 'Courier New', monospace;
`;

const MemberSince = styled.div`
  color: #00ff88;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DaysCounter = styled.span`
  background: rgba(0, 255, 136, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: white;
`;

const Profile = () => {
  const [activeTab, setActiveTab] = useState('posts');
  const [user, setUser] = useState({
    username: 'cyber_user',
    firstName: 'Alex',
    lastName: 'Chen',
    email: 'alex@chaplin.social',
    birthDate: '1998-05-15',
    bio: 'Digital artist • Music producer • Y2K enthusiast ✨',
    socialGoal: 'Conectar con creativos y compartir arte digital',
    profilePublic: true,
    radioPublic: false,

    // NUEVOS CAMPOS AÑADIDOS:
    registrationDate: '2024-01-15T10:30:00Z', // Fecha de registro
    lastLogin: '2024-02-07T14:45:00Z', // Último login
    memberSinceDays: 23, // Días desde el registro

    stats: {
      posts: 42,
      followers: 128,
      following: 86,
      radioListeners: 15
    }
  });

  const [posts, setPosts] = useState([
    {
      id: 1,
      content: 'Nuevo track en proceso #Musica #Arte',
      media_type: 'audio',
      likes: 24,
      created_at: '2024-02-06T14:30:00Z'
    },
    {
      id: 2,
      content: 'Diseño Y2K para la app #Arte #Moda',
      media_type: 'image',
      likes: 42,
      created_at: '2024-02-05T11:20:00Z'
    },
    {
      id: 3,
      content: 'Reflexiones sobre el futuro digital #Reflexiones',
      media_type: 'text',
      likes: 18,
      created_at: '2024-02-04T09:15:00Z'
    },
  ]);

  const handleToggle = (setting) => {
    setUser({
      ...user,
      [setting]: !user[setting]
    });
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular días desde el registro (si no está calculado)
  const calculateMemberDays = () => {
    if (user.registrationDate && !user.memberSinceDays) {
      const regDate = new Date(user.registrationDate);
      const now = new Date();
      const diffTime = Math.abs(now - regDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      setUser(prev => ({
        ...prev,
        memberSinceDays: diffDays
      }));
    }
  };

  useEffect(() => {
    calculateMemberDays();
  }, []);

  return (
    <ProfileContainer>
      <Header>
        <Logo>CHAPLIN</Logo>
        <button style={{
          background: 'rgba(255, 0, 85, 0.1)',
          border: '2px solid #ff0055',
          color: '#ff0055',
          padding: '10px 20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontFamily: 'Orbitron'
        }}>
          <LogOut size={20} />
          Logout
        </button>
      </Header>

      <ProfileHeader>
        <AvatarContainer>
          <Avatar>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </Avatar>
          <AvatarEdit>
            <Camera size={20} />
          </AvatarEdit>
        </AvatarContainer>

        <ProfileInfo>
          <Username>
            {user.username}
            <Edit3 size={20} style={{ cursor: 'pointer' }} />
          </Username>

          {/* NUEVA SECCIÓN AÑADIDA: Información de miembro */}
          <MemberInfo>
            <MemberSince>
              <Clock size={16} />
              <span>Usuario desde: {formatDate(user.registrationDate)}</span>
              <DaysCounter>{user.memberSinceDays} días</DaysCounter>
            </MemberSince>
            {user.lastLogin && (
              <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '5px' }}>
                Último login: {formatDate(user.lastLogin)}
              </div>
            )}
          </MemberInfo>

          <UserDetails>
            <DetailItem>
              <Mail size={14} /> {user.email}
            </DetailItem>
            <DetailItem>
              <Calendar size={14} /> {user.birthDate}
            </DetailItem>
            <DetailItem>
              {user.profilePublic ? <Globe size={14} /> : <Lock size={14} />}
              {user.profilePublic ? 'Público' : 'Privado'}
            </DetailItem>
          </UserDetails>

          <Bio>{user.bio}</Bio>

          <SocialGoal>
            <strong>Busco en una red social:</strong> {user.socialGoal}
          </SocialGoal>

          <Stats>
            <Stat>
              <StatNumber>{user.stats.posts}</StatNumber>
              <StatLabel>Posts</StatLabel>
            </Stat>
            <Stat>
              <StatNumber>{user.stats.followers}</StatNumber>
              <StatLabel>Seguidores</StatLabel>
            </Stat>
            <Stat>
              <StatNumber>{user.stats.following}</StatNumber>
              <StatLabel>Siguiendo</StatLabel>
            </Stat>
            <Stat>
              <StatNumber>{user.stats.radioListeners}</StatNumber>
              <StatLabel>Oyentes</StatLabel>
            </Stat>
          </Stats>
        </ProfileInfo>
      </ProfileHeader>

      <Tabs>
        <Tab active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
          <Image size={18} />
          Posts
        </Tab>
        <Tab active={activeTab === 'radio'} onClick={() => setActiveTab('radio')}>
          <Radio size={18} />
          Mi Radio
        </Tab>
        <Tab active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
          <Settings size={18} />
          Configuración
        </Tab>
      </Tabs>

      <ContentGrid>
        <Sidebar>
          <SettingsSection>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={20} />
              Privacidad
            </h3>

            <SettingItem>
              <SettingLabel>
                <Globe size={16} />
                Perfil público
              </SettingLabel>
              <Toggle
                active={user.profilePublic}
                onClick={() => handleToggle('profilePublic')}
              />
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                <Radio size={16} />
                Radio pública
              </SettingLabel>
              <Toggle
                active={user.radioPublic}
                onClick={() => handleToggle('radioPublic')}
              />
            </SettingItem>
          </SettingsSection>

          <SettingsSection>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={20} />
              Información
            </h3>

            <SettingItem>
              <SettingLabel>
                <Mail size={16} />
                Email verificado
              </SettingLabel>
              <span style={{ color: '#00ff88' }}>✓</span>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                <Calendar size={16} />
                Miembro desde
              </SettingLabel>
              <span style={{ color: '#aaa', fontSize: '0.9rem' }}>
                {new Date(user.registrationDate).toLocaleDateString('es-ES')}
              </span>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                <Users size={16} />
                Invitaciones
              </SettingLabel>
              <span style={{ color: '#00ff88' }}>3 restantes</span>
            </SettingItem>
          </SettingsSection>
        </Sidebar>

        <div>
          {activeTab === 'posts' && (
            <PostsGrid>
              {posts.map(post => (
                <PostThumbnail key={post.id}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                    color: '#666'
                  }}>
                    {post.media_type === 'audio' && <Music size={16} />}
                    {post.media_type === 'image' && <Image size={16} />}
                    {post.media_type === 'video' && <Video size={16} />}
                    {post.media_type === 'text' && <Edit3 size={16} />}
                    <span style={{
                      textTransform: 'uppercase',
                      fontSize: '0.8rem',
                      color: post.media_type === 'audio' ? '#00ccff' :
                             post.media_type === 'image' ? '#ffaa00' :
                             post.media_type === 'video' ? '#ff3366' : '#00ff88'
                    }}>
                      {post.media_type}
                    </span>
                  </div>
                  <p style={{ color: '#e0e0e0', marginBottom: '10px' }}>
                    {post.content}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    <span>❤️ {post.likes}</span>
                    <span>{new Date(post.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </PostThumbnail>
              ))}
            </PostsGrid>
          )}

          {activeTab === 'radio' && (
            <div style={{
              background: 'rgba(20, 20, 30, 0.8)',
              borderRadius: '15px',
              padding: '30px',
              border: '2px solid #00ff8866',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio size={24} />
                Mi Estación de Radio
              </h3>

              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <div style={{ color: '#00ff88', marginBottom: '10px' }}>
                  Estado: {user.radioPublic ? 'Pública' : 'Privada'}
                </div>
                <div style={{ color: '#aaa', marginBottom: '20px' }}>
                  {user.radioPublic
                    ? 'Cualquier usuario puede conectarse a tu radio'
                    : 'Solo usuarios que sigues pueden conectarse'
                  }
                </div>

                <button style={{
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '2px solid #00ff88',
                  color: '#00ff88',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'Orbitron',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Radio size={20} />
                  {user.radioPublic ? 'Detener transmisión' : 'Iniciar transmisión'}
                </button>
              </div>

              <div style={{ color: '#666' }}>
                <h4>Oyentes actuales: {user.stats.radioListeners}</h4>
                <p>Aquí iría la lista de usuarios conectados a tu radio...</p>
              </div>
            </div>
          )}
        </div>
      </ContentGrid>
    </ProfileContainer>
  );
};

export default Profile;