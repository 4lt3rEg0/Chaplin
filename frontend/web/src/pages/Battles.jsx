import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Pause, Play, Plus, Upload, Zap } from 'lucide-react';
import api from '../services/api';

// Same plain-page layout convention as Forum.jsx/Explore.jsx.
const Wrapper = styled.div`
  background: ${({ theme }) => theme.gradients.page};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100dvh;
  padding-top: calc(var(--chaplin-player-panel-offset, 0px) + 52px);
  padding-bottom: calc(var(--chaplin-mobile-dock-offset, 0px) + 16px);
`;

const Shell = styled.div`
  max-width: min(var(--chaplin-shell-max, 640px), 100%);
  margin: 0 auto;
  padding: 0 14px 20px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const BackButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  color: ${({ theme }) => theme.colors.text};
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
`;

const HeaderTitle = styled.h1`
  font-size: 16px;
  margin: 0;
  flex: 1;
`;

const SectionTitle = styled.h2`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
  margin: 24px 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const AddBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
`;

const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
`;

const EventTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
`;

const EventMeta = styled.div`
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 10px;
`;

const RsvpBtn = styled.button`
  border: 1px solid ${({ $on, theme }) => ($on ? '#3ddc84' : theme.colors.border)};
  background: ${({ $on }) => ($on ? 'rgba(61,220,132,0.15)' : 'transparent')};
  color: ${({ $on }) => ($on ? '#3ddc84' : 'inherit')};
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const Form = styled.form`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  display: grid;
  gap: 10px;
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 14px;
`;

const SubmitBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 12px;
  margin: 0;
`;

const InstrumentalRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  border: 1px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft : (theme.card?.bg || 'rgba(255,255,255,0.04)'))};
  color: inherit;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
`;

const ModeRow = styled.div`
  display: flex;
  gap: 6px;
  margin: 12px 0;
`;

const ModeBtn = styled.button`
  flex: 1;
  border: 1px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || theme.colors.borderStrong) : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft : 'transparent')};
  color: inherit;
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const PracticeStage = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 30px 14px;
  text-align: center;
  margin-top: 10px;
`;

const WordDisplay = styled.div`
  font-size: 34px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  min-height: 44px;
`;

const PlayPauseBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  cursor: pointer;
  margin: 16px auto 0;
`;

const StatusText = styled.p`
  text-align: center;
  opacity: 0.7;
  font-size: 13px;
  padding: 14px 10px;
`;

const MODES = [
  { id: 'easy', label: 'Easy', seconds: 10 },
  { id: 'hard', label: 'Hard', seconds: 5 },
  { id: 'extreme', label: 'Extreme', seconds: 2 }
];

export default function Battles() {
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [eventBusy, setEventBusy] = useState(false);
  const [eventError, setEventError] = useState('');

  const [instrumentals, setInstrumentals] = useState([]);
  const [wordBank, setWordBank] = useState([]);
  const [selectedInstrumental, setSelectedInstrumental] = useState(null);
  const [mode, setMode] = useState('easy');
  const [playing, setPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const loadEvents = () => api.get('/battles/events').then(({ data }) => setEvents(data)).catch(() => setEvents([]));
  const loadInstrumentals = () => api.get('/battles/instrumentals').then(({ data }) => setInstrumentals(data)).catch(() => setInstrumentals([]));

  useEffect(() => {
    loadEvents();
    loadInstrumentals();
    api.get('/battles/words').then(({ data }) => setWordBank(data)).catch(() => setWordBank([]));
  }, []);

  const submitNewEvent = async (event) => {
    event.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) {
      setEventError('Escribe un título y elige fecha/hora.');
      return;
    }
    setEventBusy(true);
    setEventError('');
    try {
      await api.post('/battles/events', { title: newEventTitle.trim(), scheduled_at: new Date(newEventDate).toISOString() });
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventOpen(false);
      loadEvents();
    } catch (err) {
      setEventError(err?.response?.data?.detail || 'No se pudo crear el evento.');
    } finally {
      setEventBusy(false);
    }
  };

  const toggleRsvp = async (eventId) => {
    const { data } = await api.post(`/battles/events/${eventId}/rsvp`);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? data : e)));
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError('Elige un archivo de audio y escribe un título.');
      return;
    }
    setUploadBusy(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('title', uploadTitle.trim());
      await api.post('/battles/instrumentals/upload', form, { timeout: 60000 });
      setUploadTitle('');
      setUploadFile(null);
      setUploadOpen(false);
      loadInstrumentals();
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'No se pudo subir la instrumental.');
    } finally {
      setUploadBusy(false);
    }
  };

  // The actual word-cycling clock: a real useEffect keyed on
  // [playing, mode, wordBank] instead of a manually-managed setInterval
  // ref - that version silently never fired (verified live: the word
  // stayed frozen for 6s straight in Extreme/2s mode). Letting React own
  // the interval's lifecycle via effect cleanup is what actually works.
  useEffect(() => {
    if (!playing || wordBank.length === 0) return undefined;
    const seconds = MODES.find((m) => m.id === mode)?.seconds || 10;
    const id = setInterval(() => {
      setCurrentWord((prev) => {
        let next = wordBank[Math.floor(Math.random() * wordBank.length)];
        if (wordBank.length > 1) {
          while (next === prev) next = wordBank[Math.floor(Math.random() * wordBank.length)];
        }
        return next;
      });
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [playing, mode, wordBank]);

  const stopPractice = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const startPractice = () => {
    if (!selectedInstrumental || !audioRef.current) return;
    audioRef.current.src = selectedInstrumental.audio_url;
    audioRef.current.play();
    setCurrentWord(wordBank.length ? wordBank[Math.floor(Math.random() * wordBank.length)] : '');
    setPlaying(true);
  };

  const togglePractice = () => {
    if (playing) stopPractice();
    else startPractice();
  };

  return (
    <Wrapper>
      <Shell>
        <HeaderRow>
          <BackButton type="button" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={16} /></BackButton>
          <HeaderTitle>Batallas de Freestyle</HeaderTitle>
        </HeaderRow>

        <SectionTitle><Calendar size={14} /> Próximos eventos</SectionTitle>
        <AddBtn type="button" onClick={() => setNewEventOpen((prev) => !prev)}>
          <Plus size={14} /> {newEventOpen ? 'Cerrar' : 'Anunciar batalla'}
        </AddBtn>

        {newEventOpen && (
          <Form onSubmit={submitNewEvent}>
            <Input placeholder="Título (ej. Batalla del Puente Viejo)" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} />
            <Input type="datetime-local" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
            {eventError && <ErrorText>{eventError}</ErrorText>}
            <SubmitBtn type="submit" disabled={eventBusy}>{eventBusy ? 'Publicando...' : 'Publicar anuncio'}</SubmitBtn>
          </Form>
        )}

        {events.length === 0 ? (
          <StatusText>Todavía no hay batallas anunciadas.</StatusText>
        ) : (
          events.map((ev) => (
            <Card key={ev.id}>
              <EventTitle>{ev.title}</EventTitle>
              <EventMeta>
                @{ev.owner_username} · {new Date(ev.scheduled_at).toLocaleString()} · {ev.attendee_count} {ev.attendee_count === 1 ? 'asistente' : 'asistentes'}
              </EventMeta>
              <RsvpBtn type="button" $on={ev.attending_by_me} onClick={() => toggleRsvp(ev.id)}>
                {ev.attending_by_me ? '✓ Asistiré' : 'Asistiré'}
              </RsvpBtn>
            </Card>
          ))
        )}

        <SectionTitle><Zap size={14} /> Instrumentales de entrenamiento</SectionTitle>
        <AddBtn type="button" onClick={() => setUploadOpen((prev) => !prev)}>
          <Upload size={14} /> {uploadOpen ? 'Cerrar' : 'Subir instrumental'}
        </AddBtn>

        {uploadOpen && (
          <Form onSubmit={submitUpload}>
            <Input placeholder="Título de la instrumental" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
            <input type="file" accept="audio/*" onChange={(e) => setUploadFile(e.target.files[0] || null)} />
            {uploadError && <ErrorText>{uploadError}</ErrorText>}
            <SubmitBtn type="submit" disabled={uploadBusy}>{uploadBusy ? 'Subiendo...' : 'Subir'}</SubmitBtn>
          </Form>
        )}

        {instrumentals.length === 0 ? (
          <StatusText>Todavía no hay instrumentales — sube la primera.</StatusText>
        ) : (
          <>
            {instrumentals.map((inst) => (
              <InstrumentalRow
                key={inst.id}
                type="button"
                $active={selectedInstrumental?.id === inst.id}
                onClick={() => { stopPractice(); setSelectedInstrumental(inst); }}
              >
                <span>{inst.title}</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>@{inst.owner_username}</span>
              </InstrumentalRow>
            ))}

            <ModeRow>
              {MODES.map((m) => (
                <ModeBtn key={m.id} type="button" $active={mode === m.id} onClick={() => { setMode(m.id); if (playing) stopPractice(); }}>
                  {m.label} ({m.seconds}s)
                </ModeBtn>
              ))}
            </ModeRow>

            {selectedInstrumental && (
              <PracticeStage>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>{selectedInstrumental.title}</div>
                <WordDisplay>{currentWord || '—'}</WordDisplay>
                <PlayPauseBtn type="button" onClick={togglePractice} aria-label={playing ? 'Pausar' : 'Practicar'}>
                  {playing ? <Pause size={22} /> : <Play size={22} />}
                </PlayPauseBtn>
              </PracticeStage>
            )}
            <audio ref={audioRef} onEnded={stopPractice} style={{ display: 'none' }} />
          </>
        )}
      </Shell>
    </Wrapper>
  );
}
