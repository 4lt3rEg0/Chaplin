import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Check, Radio as RadioIcon, X } from 'lucide-react';
import api from '../services/api';
import { useSkin } from '../context/SkinContext';

const Panel = styled.section`
  margin-top: 20px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
`;

const Title = styled.h3`
  margin: 0 0 12px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.primary};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Meta = styled.div`
  flex: 1;
  min-width: 0;
`;

const TrackTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
`;

const TrackOwner = styled.div`
  font-size: 11px;
  opacity: 0.7;
`;

const ActionBtn = styled.button`
  border: 1px solid ${({ $tone, theme }) => ($tone === 'reject' ? '#ff6b6b' : theme.colors.primary)};
  background: transparent;
  color: ${({ $tone }) => ($tone === 'reject' ? '#ff6b6b' : 'inherit')};
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Empty = styled.p`
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
`;

export default function RadioSubmissionsReview() {
  const { appTheme } = useSkin();
  const [submissions, setSubmissions] = useState(null); // null = not a curator / not loaded
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get('/radio/submissions')
      .then(({ data }) => setSubmissions(data))
      .catch(() => setSubmissions(null));
  }, []);

  if (submissions === null) {
    return null;
  }

  const decide = async (trackId, action) => {
    setBusyId(trackId);
    try {
      await api.post(`/radio/submissions/${trackId}/${action}`);
      setSubmissions((prev) => prev.filter((t) => t.id !== trackId));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel>
      <Title>
        <RadioIcon size={14} />
        Solicitudes pendientes para Radio Chaplin
      </Title>
      {submissions.length === 0 ? (
        <Empty>No hay canciones esperando revisión.</Empty>
      ) : (
        submissions.map((track) => (
          <Row key={track.id}>
            <Meta>
              <TrackTitle>{track.title}</TrackTitle>
              <TrackOwner>@{track.owner_username}</TrackOwner>
            </Meta>
            <ActionBtn type="button" disabled={busyId === track.id} onClick={() => decide(track.id, 'approve')}>
              <Check size={12} /> Aprobar
            </ActionBtn>
            <ActionBtn type="button" $tone="reject" disabled={busyId === track.id} onClick={() => decide(track.id, 'reject')}>
              <X size={12} /> Rechazar
            </ActionBtn>
          </Row>
        ))
      )}
    </Panel>
  );
}
