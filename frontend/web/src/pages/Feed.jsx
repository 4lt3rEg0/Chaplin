import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SpiralFeed from '../components/SpiralFeed';
import RadioPlayer from '../components/RadioPlayer';
import { Music, Radio, Send, Image, Video } from 'lucide-react';

const Container = styled.div`
  min-height: 100vh;
  background: #0a0a0f;
  color: #00ff88;
`;

const Header = styled.header`
  padding: 20px;
  border-bottom: 2px solid #00ff88;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.h1`
  font-family: 'Orbitron', monospace;
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 0 0 10px #00ff88;
  letter-spacing: 2px;
`;

const CreatePost = styled.div`
  background: rgba(20, 20, 30, 0.8);
  border: 2px solid #00ff88;
  border-radius: 15px;
  padding: 20px;
  margin: 20px;
  backdrop-filter: blur(10px);
`;

const TextArea = styled.textarea`
  width: 100%;
  background: transparent;
  border: none;
  color: #00ff88;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  resize: none;
  outline: none;

  &::placeholder {
    color: #00ff8866;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const IconButton = styled.button`
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  color: #00ff88;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s;

  &:hover {
    background: rgba(0, 255, 136, 0.3);
    box-shadow: 0 0 15px #00ff88;
  }
`;

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);

  useEffect(() => {
    // Fetch posts from API
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/v1/posts/');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const formData = new FormData();
    formData.append('content', newPost);
    formData.append('is_public', true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/posts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const post = await response.json();
        setPosts([post, ...posts]);
        setNewPost('');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <Container>
      <Header>
        <Logo>CHAPLIN</Logo>
        <RadioPlayer
          isPlaying={isRadioPlaying}
          onToggle={() => setIsRadioPlaying(!isRadioPlaying)}
        />
      </Header>

      <CreatePost>
        <TextArea
          placeholder="¿Qué estás pensando? Usa #tags# para categorizar..."
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          rows={3}
        />
        <Toolbar>
          <IconButton type="button">
            <Image size={20} /> Foto
          </IconButton