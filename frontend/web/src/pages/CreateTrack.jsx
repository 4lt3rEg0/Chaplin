import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TrackUploadForm from '../components/TrackUploadForm';
import { Z_INDEX } from '../styles/zIndexScale';

// Same full-screen overlay shell as BookEditor.jsx/Publish.jsx, kept
// self-contained here (not worth sharing styled-components across files
// for a handful of small tags — same rationale already recorded in
// BookEditor.jsx).
const Shell = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 10px;
  background: linear-gradient(180deg, rgba(6, 10, 16, 0.92), rgba(6, 10, 16, 0.4));
`;

const IconBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 12px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
`;

const Body = styled.div`
  overflow-y: auto;
  padding: 16px;
  display: grid;
  gap: 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
`;

export default function CreateTrack() {
  const navigate = useNavigate();

  return (
    <Shell>
      <TopBar>
        <IconBtn type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /></IconBtn>
        <Title>Subir canción</Title>
      </TopBar>
      <Body>
        <TrackUploadForm onSuccess={() => navigate('/profile?tab=musica')} />
      </Body>
    </Shell>
  );
}
