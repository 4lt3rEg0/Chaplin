import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Heart, MessageCircle, Share2, Music, Video, Image,
  MoreVertical, Globe, Lock, Play, Pause, FileText,
  Volume2, Eye, Calendar
} from 'lucide-react';

// Badge de tipo de contenido
const MediaBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: ${props =>
    props.type === 'text' ? 'rgba(0, 123, 255, 0.2)' :
    props.type === 'image' ? 'rgba(255, 165, 0, 0.2)' :
    props.type === 'video' ? 'rgba(220, 53, 69, 0.2)' :
    'rgba(0, 200, 83, 0.2)'};
  border: 1px solid ${props =>
    props.type === 'text' ? '#007bff' :
    props.type === 'image' ? '#ffa500' :
    props.type === 'video' ? '#dc3545' :
    '#00c853'};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: ${props =>
    props.type === 'text' ? '#007bff' :
    props.type === 'image' ? '#ffa500' :
    props.type === 'video' ? '#dc3545' :
    '#00c853'};
  z-index: 10;
  backdrop-filter: blur(5px);
`;

const Card = styled.div`
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid #00ff8866;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  position: relative;
  transition: all 0.3s;

  &:hover {
    border-color: #00ff88;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.2);
    transform: translateY(-2px);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, #00ff88, #ff00ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-family: 'Orbitron', monospace;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.span`
  color: #00ff88;
  font-weight: bold;
  font-family: 'Courier New', monospace;
`;

const Timestamp = styled.span`
  color: #666;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
`;

const Content = styled.p`
  color: #e0e0e0;
  margin: 15px 0;
  line-height: 1.6;
  font-family: 'Courier New', monospace;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
`;

const Tag = styled.span`
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid #00ff8866;
  font-family: 'Courier New', monospace;
`;

const MediaContainer = styled.div`
  margin: 15px 0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
`;

const ImageMedia = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #00ff8866;
`;

const VideoMedia = styled.video`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #dc3545;
`;

const AudioPlayer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #00c853;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const AudioControls = styled.button`
  background: #00c853;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: black;
`;

const TextContent = styled.div`
  background: rgba(0, 123, 255, 0.1);
  border: 1px solid #007bff;
  border-radius: 8px;
  padding: 20px;
  margin: 15px 0;
  font-family: 'Courier New', monospace;
  color: #e0e0e0;
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #333;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 15px;
  border-radius: 8px;
  transition: all 0.3s;

  &:hover {
    color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }

  &.liked {
    color: #ff00ff;
  }
`;

const CommentSection = styled.div`
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #333;
`;

const CommentInput = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const Input = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333;
  border-radius: 20px;
  padding: 10px 15px;
  color: white;
  font-family: 'Courier New', monospace;

  &:focus {
    outline: none;
    border-color: #00ff88;
  }
`;

const Comment = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
`;

const MediaTypeIcon = ({ type }) => {
  switch(type) {
    case 'image':
      return <Image size={16} />;
    case 'video':
      return <Video size={16} />;
    case 'audio':
      return <Music size={16} />;
    case 'text':
      return <FileText size={16} />;
    default:
      return <FileText size={16} />;
  }
};

const getMediaTypeColor = (type) => {
  switch(type) {
    case 'text': return '#007bff';
    case 'image': return '#ffa500';
    case 'video': return '#dc3545';
    case 'audio': return '#00c853';
    default: return '#666';
  }
};

const PostCard = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const handleComment = () => {
    if (newComment.trim()) {
      setComments([...comments, {
        id: Date.now(),
        user: 'You',
        content: newComment,
        timestamp: new Date().toISOString()
      }]);
      setNewComment('');
    }
  };

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

  const renderMedia = () => {
    switch(post.media_type) {
      case 'image':
        return (
          <MediaContainer>
            <ImageMedia src={post.media_url || 'https://picsum.photos/600/400'} alt="Post image" />
          </MediaContainer>
        );

      case 'video':
        return (
          <MediaContainer>
            <VideoMedia
              src={post.media_url}
              controls
              poster="https://picsum.photos/600/400?grayscale"
            />
          </MediaContainer>
        );

      case 'audio':
        return (
          <AudioPlayer>
            <AudioControls onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </AudioControls>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#00c853', fontFamily: 'Courier New' }}>
                Audio compartido
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {post.filename || 'audio_file.mp3'}
              </div>
            </div>
            <Volume2 size={24} color="#00c853" />
          </AudioPlayer>
        );

      case 'text':
        return (
          <TextContent>
            {post.content}
          </TextContent>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <Header>
        <UserInfo>
          <Avatar>
            {post.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <UserDetails>
            <Username>{post.username || 'Usuario'}</Username>
            <Timestamp>
              <Calendar size={12} />
              {formatDate(post.created_at || new Date().toISOString())}
              {!post.is_public && <Lock size={12} style={{ marginLeft: '5px' }} />}
            </Timestamp>
          </UserDetails>
        </UserInfo>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MoreVertical size={20} color="#666" style={{ cursor: 'pointer' }} />
        </div>
      </Header>

      {/* Badge de tipo de contenido */}
      <MediaBadge type={post.media_type || 'text'}>
        <MediaTypeIcon type={post.media_type} />
      </MediaBadge>

      {/* Solo mostrar contenido si no es tipo texto (ya que el texto va en TextContent) */}
      {post.media_type !== 'text' && post.content && (
        <Content>{post.content}</Content>
      )}

      {post.tags && (
        <Tags>
          {post.tags.split('#').filter(tag => tag.trim()).map((tag, index) => (
            <Tag key={index}>#{tag.trim()}</Tag>
          ))}
        </Tags>
      )}

      {renderMedia()}

      <Actions>
        <ActionButton
          onClick={handleLike}
          className={liked ? 'liked' : ''}
        >
          <Heart size={18} fill={liked ? '#ff00ff' : 'none'} />
          {likes}
        </ActionButton>

        <ActionButton>
          <MessageCircle size={18} />
          {comments.length}
        </ActionButton>

        <ActionButton>
          <Share2 size={18} />
          Compartir
        </ActionButton>
      </Actions>

      <CommentSection>
        {comments.map(comment => (
          <Comment key={comment.id}>
            <Avatar style={{ width: '30px', height: '30px' }}>
              {comment.user?.charAt(0)}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Username style={{ fontSize: '14px' }}>{comment.user}</Username>
              <Content style={{ margin: '5px 0', fontSize: '14px' }}>
                {comment.content}
              </Content>
            </div>
          </Comment>
        ))}

        <CommentInput>
          <Input
            placeholder="Añade un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleComment()}
          />
          <ActionButton onClick={handleComment}>
            <MessageCircle size={16} />
          </ActionButton>
        </CommentInput>
      </CommentSection>
    </Card>
  );
};

export default PostCard;