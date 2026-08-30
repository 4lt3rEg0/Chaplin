import React, { useEffect, useRef, useState } from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle, Hand } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
// ‍ (ZWJ) and ️ (variation selector-16) glue compound emoji like
// "👨‍👩‍👧" or add emoji presentation to symbols like "❤️" — without them those
// sequences would fail the pictographic-only check and render as normal text.
const EMOJI_ONLY_REGEX = /^[\p{Extended_Pictographic}‍️\s]{1,12}$/u;

const isEmojiOnly = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  return trimmed.length > 0 && EMOJI_ONLY_REGEX.test(trimmed);
};

const ShakeStyle = createGlobalStyle`
  @keyframes chaplin-nudge-shake {
    0%, 100% { transform: translate3d(0, 0, 0); }
    10% { transform: translate3d(-10px, 0, 0) rotate(-1deg); }
    20% { transform: translate3d(9px, 0, 0) rotate(1deg); }
    30% { transform: translate3d(-8px, 0, 0) rotate(-1deg); }
    40% { transform: translate3d(7px, 0, 0) rotate(1deg); }
    50% { transform: translate3d(-6px, 0, 0) rotate(-0.5deg); }
    60% { transform: translate3d(5px, 0, 0) rotate(0.5deg); }
    70% { transform: translate3d(-4px, 0, 0); }
    80% { transform: translate3d(3px, 0, 0); }
    90% { transform: translate3d(-2px, 0, 0); }
  }
`;

const Wrapper = styled.div`
  background: ${({ theme }) => theme.gradients.page};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100dvh;
  padding-top: var(--chaplin-player-panel-offset, 0px);
  padding-bottom: calc(var(--chaplin-mobile-dock-offset, 0px) + 16px);
`;

const Shell = styled.div`
  max-width: min(var(--chaplin-shell-max, 900px), 100%);
  margin: 0 auto;
  padding: 20px 14px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  height: calc(100dvh - var(--chaplin-player-panel-offset, 0px) - var(--chaplin-mobile-dock-offset, 0px));

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const Panel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.card?.bg || "rgba(255,255,255,0.04)"};
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const ListPanel = styled(Panel)`
  @media (max-width: 760px) {
    display: ${({ $hideOnMobile }) => ($hideOnMobile ? "none" : "flex")};
    min-height: 60dvh;
  }
`;

const ConversationPanel = styled(Panel)`
  ${({ $shaking }) => $shaking && css`animation: chaplin-nudge-shake 0.5s ease;`}

  @media (max-width: 760px) {
    display: ${({ $hideOnMobile }) => ($hideOnMobile ? "none" : "flex")};
    min-height: 60dvh;
  }
`;

const PanelHeader = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: none;
  padding: 0;

  @media (max-width: 760px) {
    display: flex;
  }
`;

const ConvoList = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const ConvoItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft || "rgba(255,255,255,0.08)" : "transparent")};
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.accentSoft || "rgba(255,255,255,0.06)"};
  }
`;

const Avatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ConvoMeta = styled.div`
  min-width: 0;
  flex: 1;
`;

const ConvoName = styled.div`
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ConvoPreview = styled.div`
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const UnreadBadge = styled.span`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.background || "#000"};
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
`;

const NewConvoForm = styled.form`
  display: flex;
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const NewConvoInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  color: inherit;
  font-size: 13px;
`;

const IconBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.accentSoft || "rgba(255,255,255,0.06)"};
  color: inherit;
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0.6;
  padding: 20px;
  text-align: center;
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MessageBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  margin-bottom: 6px;
  position: relative;
`;

const Bubble = styled.button`
  max-width: 75%;
  padding: ${({ $big }) => ($big ? "0" : "8px 12px")};
  border-radius: 14px;
  font-size: ${({ $big }) => ($big ? "52px" : "14px")};
  line-height: 1.4;
  word-break: break-word;
  background: ${({ $mine, $big, theme }) => ($big ? "transparent" : $mine ? theme.colors.primary : "rgba(255,255,255,0.08)")};
  color: ${({ $mine, theme }) => ($mine ? theme.colors.background || "#000" : theme.colors.text)};
  border: none;
  border-bottom-right-radius: ${({ $mine, $big }) => (!$big && $mine ? "4px" : "14px")};
  border-bottom-left-radius: ${({ $mine, $big }) => (!$big && !$mine ? "4px" : "14px")};
  text-align: left;
  cursor: pointer;
  font-family: inherit;
`;

const NudgeBubble = styled.div`
  align-self: center;
  font-size: 12px;
  opacity: 0.7;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 0;
`;

const ReactionRow = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 3px;
`;

const ReactionPill = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $mine, theme }) => ($mine ? theme.colors.accentSoft || "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)")};
  color: inherit;
  border-radius: 999px;
  font-size: 11px;
  padding: 1px 7px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
`;

const ReactionPicker = styled.div`
  position: absolute;
  top: -38px;
  ${({ $mine }) => ($mine ? "right: 0;" : "left: 0;")}
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.card?.bg || "#141821"};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  padding: 4px 6px;
  z-index: 20;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
`;

const ReactionEmojiBtn = styled.button`
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 4px;

  &:hover {
    transform: scale(1.2);
  }
`;

const Composer = styled.form`
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ComposerInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  padding: 10px 16px;
  color: inherit;
  font-size: 14px;
`;

const SendBtn = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.background || "#000"};
  border: none;
  border-radius: 999px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NudgeBtn = styled(SendBtn)`
  background: ${({ theme }) => theme.colors.accentSoft || "rgba(255,255,255,0.1)"};
  color: ${({ theme }) => theme.colors.text};
`;

const POLL_INTERVAL_MS = 4000;

export default function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [startError, setStartError] = useState("");
  const [openPickerId, setOpenPickerId] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
  const messagesEndRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());

  const loadConversations = async () => {
    try {
      const { data } = await api.get("/conversations/");
      setConversations(data);
    } catch {
      // keep last known list on transient failure
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const startWith = location.state?.startWith;
    if (!startWith) return;

    api.post("/conversations/", { username: startWith })
      .then(({ data }) => {
        loadConversations();
        openConversation(data.id);
      })
      .catch(() => {});
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const triggerNudgeEffect = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 500);
    if (navigator.vibrate) {
      navigator.vibrate([120, 60, 120, 60, 200]);
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 320;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // best-effort — silent if the browser blocks audio without a gesture
    }
  };

  useEffect(() => {
    if (!activeId) return undefined;

    let cancelled = false;
    seenMessageIdsRef.current = new Set();

    const loadMessages = async () => {
      try {
        const { data } = await api.get(`/conversations/${activeId}/messages`);
        if (cancelled) return;

        const newIncomingNudge = data.some((m) => (
          m.message_type === "nudge"
          && m.sender_id !== user?.id
          && !seenMessageIdsRef.current.has(m.id)
        ));
        seenMessageIdsRef.current = new Set(data.map((m) => m.id));
        setMessages(data);
        if (newIncomingNudge) triggerNudgeEffect();
      } catch {
        // keep last known messages on transient failure
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const openConversation = (id) => {
    setActiveId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
  };

  const startConversation = async (event) => {
    event.preventDefault();
    const username = newUsername.trim().replace(/^@/, "");
    if (!username) return;

    setStartError("");
    try {
      const { data } = await api.post("/conversations/", { username });
      setNewUsername("");
      await loadConversations();
      openConversation(data.id);
    } catch (error) {
      setStartError(error?.response?.status === 404 ? "Usuario no encontrado" : "No se pudo iniciar la conversación");
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeId) return;

    setDraft("");
    try {
      const { data } = await api.post(`/conversations/${activeId}/messages`, { content });
      seenMessageIdsRef.current.add(data.id);
      setMessages((prev) => [...prev, data]);
    } catch {
      setDraft(content);
    }
  };

  const sendNudge = async () => {
    if (!activeId || nudgeCooldown) return;
    setNudgeCooldown(true);
    window.setTimeout(() => setNudgeCooldown(false), 3000);
    try {
      const { data } = await api.post(`/conversations/${activeId}/nudge`);
      seenMessageIdsRef.current.add(data.id);
      setMessages((prev) => [...prev, data]);
      triggerNudgeEffect();
    } catch {
      // rate-limited or transient failure — the cooldown timer already covers this
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    setOpenPickerId(null);
    try {
      const { data } = await api.post(`/messages/${messageId}/react`, { emoji });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? data : m)));
    } catch {
      // ignore — next poll will reconcile
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeId) || null;

  return (
    <Wrapper>
      <ShakeStyle />
      <Shell>
        <ListPanel $hideOnMobile={Boolean(activeId)}>
          <PanelHeader>Mensajes</PanelHeader>
          <NewConvoForm onSubmit={startConversation}>
            <NewConvoInput
              placeholder="@usuario para escribir"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
            <IconBtn type="submit" aria-label="Iniciar conversación">
              <Send size={16} />
            </IconBtn>
          </NewConvoForm>
          {startError && (
            <div style={{ padding: "0 12px 8px", fontSize: 12, color: "#ff6b6b" }}>{startError}</div>
          )}
          <ConvoList>
            {conversations.length === 0 && (
              <EmptyState>
                <MessageCircle size={28} />
                <span>Todavía no tienes conversaciones. Escribe un usuario arriba para empezar.</span>
              </EmptyState>
            )}
            {conversations.map((c) => (
              <ConvoItem key={c.id} $active={c.id === activeId} onClick={() => openConversation(c.id)}>
                <Avatar>
                  {c.other_avatar_url ? <img src={c.other_avatar_url} alt="" /> : c.other_username[0]?.toUpperCase()}
                </Avatar>
                <ConvoMeta>
                  <ConvoName>
                    @{c.other_username}
                    {c.unread_count > 0 && <UnreadBadge>{c.unread_count}</UnreadBadge>}
                  </ConvoName>
                  <ConvoPreview>{c.last_message || "Sin mensajes todavía"}</ConvoPreview>
                </ConvoMeta>
              </ConvoItem>
            ))}
          </ConvoList>
        </ListPanel>

        <ConversationPanel $hideOnMobile={!activeId} $shaking={shaking}>
          {!activeConvo ? (
            <EmptyState>
              <MessageCircle size={28} />
              <span>Selecciona una conversación</span>
            </EmptyState>
          ) : (
            <>
              <PanelHeader>
                <BackButton type="button" onClick={() => setActiveId(null)} aria-label="Volver">
                  <ArrowLeft size={18} />
                </BackButton>
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/profile/${activeConvo.other_username}`)}
                >
                  @{activeConvo.other_username}
                </span>
              </PanelHeader>
              <MessagesArea>
                {messages.map((m) => {
                  if (m.message_type === "nudge") {
                    return (
                      <NudgeBubble key={m.id}>
                        👋 {m.sender_id === user?.id ? "Le enviaste un toque" : `@${activeConvo.other_username} te envió un toque`}
                      </NudgeBubble>
                    );
                  }

                  const mine = m.sender_id === user?.id;
                  const big = isEmojiOnly(m.content);

                  return (
                    <MessageBlock key={m.id} $mine={mine}>
                      {openPickerId === m.id && (
                        <ReactionPicker $mine={mine}>
                          {QUICK_REACTIONS.map((emoji) => (
                            <ReactionEmojiBtn key={emoji} type="button" onClick={() => toggleReaction(m.id, emoji)}>
                              {emoji}
                            </ReactionEmojiBtn>
                          ))}
                        </ReactionPicker>
                      )}
                      <Bubble
                        type="button"
                        $mine={mine}
                        $big={big}
                        onClick={() => setOpenPickerId((prev) => (prev === m.id ? null : m.id))}
                      >
                        {m.content}
                      </Bubble>
                      {m.reactions?.length > 0 && (
                        <ReactionRow>
                          {m.reactions.map((r) => (
                            <ReactionPill
                              key={r.emoji}
                              type="button"
                              $mine={r.reacted_by_me}
                              onClick={() => toggleReaction(m.id, r.emoji)}
                            >
                              {r.emoji} {r.count}
                            </ReactionPill>
                          ))}
                        </ReactionRow>
                      )}
                    </MessageBlock>
                  );
                })}
                <div ref={messagesEndRef} />
              </MessagesArea>
              <Composer onSubmit={sendMessage}>
                <NudgeBtn type="button" onClick={sendNudge} disabled={nudgeCooldown} aria-label="Enviar un toque" title="Enviar un toque">
                  <Hand size={18} />
                </NudgeBtn>
                <ComposerInput
                  placeholder="Escribe un mensaje..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={4000}
                />
                <SendBtn type="submit" disabled={!draft.trim()} aria-label="Enviar">
                  <Send size={18} />
                </SendBtn>
              </Composer>
            </>
          )}
        </ConversationPanel>
      </Shell>
    </Wrapper>
  );
}
