import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Radio as RadioIcon, Volume2, Users, Globe, User } from 'lucide-react';

const RadioContainer = styled.div`
  background: rgba(20, 20, 30, 0.9);
  border: 2px solid #00ff88;
  border-radius: 15px;
  padding: 15px;
  backdrop-filter: blur(10px);
  min-width: 300px;
`;

const RadioHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
`;

const RadioTitle = styled.h3`
  margin: 0;
  color: #00ff88;
  font-family: 'Orbitron', monospace;
  text-shadow: 0 0 5px #00ff88;
`;

const StationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
`;

const Station = styled.button`
  background: ${props => props.active ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.active ? '#00ff88' : '#333'};
  border-radius: 8px;
  padding: 10px 15px;
  color: ${props => props.active ? '#00ff88' : '#aaa'};
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
`;

const ControlButton = styled.button`
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  color: #00ff88;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(0, 255, 136, 0.3);
    box-shadow: 0 0 20px #00ff88;
    transform: scale(1.1);
  }

  &.playing {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
  }
`;

const VolumeSlider = styled.input`
  flex: 1;
  -webkit-appearance: none;
  height: 4px;
  background: rgba(0, 255, 136, 0.2);
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00ff88;
    cursor: pointer;
  }
`;

const Listeners = styled.div`
  color: #00ff88;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
`;

const RadioPlayer = ({ isPlaying, onToggle }) => {
  const [volume, setVolume] = useState(80);
  const [currentStation, setCurrentStation] = useState('global');
  const [listeners, setListeners] = useState(0);
  const audioRef = useRef(null);

  const stations = [
    { id: 'global', name: 'Radio Global', icon: <Globe size={16} />, public: true },
    { id: 'electronic', name: 'Electronic Beats', icon: <RadioIcon size={16} />, public: true },
    { id: 'y2k', name: 'Y2K Vibes', icon: <RadioIcon size={16} />, public: true },
  ];

  useEffect(() => {
    // Conectar al WebSocket del servidor de radio
    const ws = new WebSocket('ws://localhost:8001/ws');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'listeners_update') {
        setListeners(data.count);
      }
    };

    return () => ws.close();
  }, []);

  const handleStationSelect = (stationId) => {
    setCurrentStation(stationId);
    if (isPlaying) {
      // Aquí cambiarías la fuente de audio
      console.log(`Cambiando a estación: ${stationId}`);
    }
  };

  return (
    <RadioContainer>
      <RadioHeader>
        <RadioIcon size={24} color="#00ff88" />
        <RadioTitle>CHAPLIN RADIO</RadioTitle>
      </RadioHeader>

      <StationList>
        {stations.map(station => (
          <Station
            key={station.id}
            active={currentStation === station.id}
            onClick={() => handleStationSelect(station.id)}
          >
            {station.icon}
            <span>{station.name}</span>
          </Station>
        ))}
      </StationList>

      <audio ref={audioRef} style={{ display: 'none' }} />

      <Controls>
        <ControlButton
          className={isPlaying ? 'playing' : ''}
          onClick={onToggle}
        >
          <RadioIcon size={20} />
        </ControlButton>

        <Volume2 size={20} color="#00ff88" />
        <VolumeSlider
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
        />
      </Controls>

      <Listeners>
        <Users size={14} />
        <span>{listeners} usuarios conectados</span>
      </Listeners>
    </RadioContainer>
  );
};

export default RadioPlayer;