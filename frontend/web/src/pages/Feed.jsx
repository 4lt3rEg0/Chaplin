import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
  MessageCircle,
  Send,
  PlusSquare,
  Video,
  Music,
  Type,
  Image,
  Inbox,
  X,
  Camera,
  Sliders,
  Eye,
  EyeOff,
  BookOpen,
  Play,
  Pause
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSkin } from '../context/SkinContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Z_INDEX } from '../styles/zIndexScale';
import MediaEditor from '../components/MediaEditor';

const CREATOR_MODES = ['feed', 'historia', 'reel', 'directo', 'camara'];

const Shell = styled.div`
  max-width: min(var(--chaplin-shell-max, 1220px), 100%);
  margin: 0 auto;
  position: relative;
`;

const FeedGrid = styled.div`
  display: grid;
  grid-template-areas: "left center right";
  grid-template-columns: ${({ $layoutTemplate }) => {
    if ($layoutTemplate === 'studio') return '220px minmax(0, 720px) 240px';
    if ($layoutTemplate === 'terminal') return '200px minmax(0, 760px) 200px';
    if ($layoutTemplate === 'edge') return '180px minmax(0, 780px) 180px';
    if ($layoutTemplate === 'collector' || $layoutTemplate === 'arcade') return '210px minmax(0, 740px) 210px';
    return 'minmax(0, 820px)';
  }};
  gap: var(--layout-gap, 22px);
  justify-content: center;
  align-items: start;

  ${({ $layoutTemplate }) => !['studio','terminal','edge','collector','arcade'].includes($layoutTemplate) && `
    grid-template-areas: "center";
  `}

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    grid-template-areas: ${({ $layoutTemplate }) => ['edge','studio','collector','arcade'].includes($layoutTemplate) ? '"right" "center"' : '"center"'};
  }
`;

const FeedLeftRail = styled.aside`
  grid-area: left;
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
  position: sticky;
  top: 130px;

  @media (max-width: 1100px) { display: none; }
`;

const FeedCenter = styled.main`
  grid-area: center;
  display: block;
  min-width: 0;
`;

const FeedRightRail = styled.aside`
  grid-area: right;
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
  position: sticky;
  top: 130px;

  @media (max-width: 1100px) {
    display: ${({ $mobileVisible }) => $mobileVisible ? 'block' : 'none'};
    position: static;

    > section { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }

  @media (max-width: 560px) {
    > section { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
`;

const SidePanel = styled.section`
  padding: 14px;
  display: grid;
  gap: 10px;
`;

const SideTitle = styled.h3`
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.primary};
`;

const TopBanner = styled.div`
  position: relative;
  z-index: 1;
  padding: 14px;
  margin-bottom: 14px;
`;

const FeedTitle = styled.h1`
  margin: 0;
  letter-spacing: 0.22em;
  font-size: clamp(19px, 3.4vw, 31px);
  font-family: ${({ theme }) => theme.fonts.primary};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
  text-shadow: 0 0 18px rgba(146, 234, 255, 0.35);
`;

const FeedSubtitle = styled.p`
  margin: 6px 0 0;
  font-size: 11px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.9;
`;

const EcosTitle = styled.h2`
  margin: 0 0 8px;
  letter-spacing: 0.16em;
  font-size: 11px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const EcosRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(82px, 102px);
  gap: 10px;
  overflow-x: auto;
  padding: 4px 2px 14px;
  position: relative;
  z-index: 1;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 999px;
  }
`;

const EcoShard = styled.button`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  padding: 9px 8px 10px;
  display: grid;
  gap: 7px;
  justify-items: center;
  border-radius: ${({ theme }) => theme.card?.radius || '18px'};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 10px 24px rgba(115, 228, 255, 0.18);
  }
`;

const EcoCore = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #060a0f;
  font-weight: 700;
  font-size: 15px;
  background: ${({ theme }) => theme.gradients.chrome};
  border: 1px solid rgba(255, 255, 255, 0.55);
`;

const EcoLabel = styled.span`
  font-size: 11px;
  letter-spacing: 0.05em;
  opacity: 0.95;
`;

const Stack = styled.div`
  display: grid;
  gap: 14px;
  position: relative;
  z-index: 1;
`;

const Card = styled.article`
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const MediaType = styled.span`
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const AuthorButton = styled.button`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.card?.radius || '18px'};
  padding: 6px 11px;
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.accentSoft};
`;

const CardContent = styled.div`
  padding: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const TextBody = styled.p`
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
`;

const MediaImg = styled.img`
  width: 100%;
  max-height: 560px;
  object-fit: cover;
`;

const MediaVideo = styled.video`
  width: 100%;
  max-height: 560px;
  background: #05070b;
`;

const MediaAudio = styled.audio`
  width: 100%;
`;

const TrackBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.06)'};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 5px 12px 5px 8px;
  font-size: 11px;
  cursor: pointer;
  margin-top: 8px;
`;

const ActionRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0 14px 12px;
`;

const ActionButton = styled.button`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: ${({ theme }) => theme.card?.radius || '16px'};
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const HarlequinMask = styled.span`
  position: relative;
  width: 18px;
  height: 22px;
  border: 1px solid currentColor;
  clip-path: polygon(18% 0, 50% 8%, 82% 0, 100% 28%, 90% 76%, 50% 100%, 10% 76%, 0 28%);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(90deg, rgba(250, 244, 198, 0.96) 0 48%, rgba(119, 230, 255, 0.92) 48% 100%)'
    : 'linear-gradient(90deg, rgba(255,255,255,0.20) 0 48%, rgba(130,180,220,0.14) 48% 100%)')};
  box-shadow: ${({ $active }) => ($active ? '0 0 12px rgba(126, 237, 255, 0.22)' : 'none')};

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    width: 6px;
    height: 6px;
    border-radius: 2px;
    border: 1px solid currentColor;
    background: currentColor;
    transform: rotate(45deg);
  }

  &::before {
    left: 1px;
  }

  &::after {
    right: 1px;
  }
`;

const HarlequinFace = styled.span`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  inset: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 7px;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #111820;
    box-shadow: 0 0 0 1px rgba(17, 24, 32, 0.18);
  }

  &::before {
    left: 5px;
  }

  &::after {
    right: 5px;
  }
`;

const HarlequinSmile = styled.span`
  position: absolute;
  left: 50%;
  bottom: 4px;
  transform: translateX(-50%);
  width: 8px;
  height: 4px;
  border-bottom: 1.5px solid #111820;
  border-radius: 0 0 8px 8px;
`;

const HarlequinTear = styled.span`
  position: absolute;
  top: 10px;
  right: 3px;
  width: 3px;
  height: 5px;
  background: rgba(17, 24, 32, 0.82);
  clip-path: polygon(50% 0, 100% 42%, 50% 100%, 0 42%);
`;

const CommentBox = styled.div`
  border-top: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.border};
  padding: 10px 14px 14px;
`;

const CommentList = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
`;

const CommentItem = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text};
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: ${({ theme }) => theme.card?.radius || '14px'};
  padding: 9px 10px;
  background: ${({ theme }) => theme.colors.accentSoft};
`;

const CommentForm = styled.form`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
`;

const CommentInput = styled.input`
  border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.card?.radius || '14px'};
  padding: 11px 12px;
  font-size: 12px;
`;

const ComposerBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, rgba(52, 87, 123, 0.38), rgba(0, 0, 0, 0.72));
  display: grid;
  place-items: center;
  z-index: ${Z_INDEX.MODAL};
  padding: 12px;
`;

const Composer = styled.form`
  width: min(690px, 100%);
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: 18px;
  padding: 12px;
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    ${({ theme }) => theme.card?.shadow || '0 24px 62px rgba(0, 0, 0, 0.65)'};
`;

const CreatorShell = styled.form`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  border: none;
  border-radius: 0;
  padding: 0;
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow: none;
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
`;

const CreatorTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
  background: linear-gradient(180deg, rgba(6, 10, 16, 0.92), rgba(6, 10, 16, 0.4));
`;

const CreatorStage = styled.div`
  position: relative;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 16px;
  min-height: min(58vh, 620px);
  background: radial-gradient(circle at 50% 30%, rgba(124, 190, 255, 0.14), rgba(4, 7, 12, 0.95));
  overflow: hidden;
  margin: 0;
`;

const CameraPreview = styled.video`
  width: 100%;
  height: min(58vh, 620px);
  object-fit: cover;
  display: block;
`;

const CameraPlaceholder = styled.div`
  width: 100%;
  height: min(58vh, 620px);
  display: grid;
  place-items: center;
  text-align: center;
  padding: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CreatorTools = styled.div`
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  display: grid;
  align-content: start;
  gap: 10px;
  z-index: 3;
`;

const ToolButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text)};
  padding: 2px;
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.84)};
  display: grid;
  place-items: center;

  &:hover {
    opacity: 1;
    transform: scale(1.06);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }
`;

const CreatorModeRail = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 6px;
  z-index: 3;
  touch-action: none;
  user-select: none;
  padding: 0;
`;

const ModeItem = styled.div`
  font-size: 9px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text)};
  opacity: ${({ $active }) => ($active ? 1 : 0.58)};
  transform: ${({ $active }) => ($active ? 'scale(1.12)' : 'scale(1)')};
  text-shadow:
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(0, 0, 0, 0.66);
  transition: opacity 0.2s ease, transform 0.2s ease;
`;

const CreatorFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(0deg, rgba(6, 10, 16, 0.94), rgba(6, 10, 16, 0.45));
`;

const DiaryWidget = styled.button`
  position: absolute;
  /* Bottom-right, not bottom-left — CreatorTools is a full-height icon
     column anchored at left:12/top:12/bottom:12, so bottom-left is
     guaranteed to overlap it whenever the icon stack's real height reaches
     the bottom (routine on short/mobile viewports). */
  right: 12px;
  bottom: 12px;
  z-index: 4;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 14px;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.06)),
    ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  padding: 8px 10px;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
`;

const DiaryNotice = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CameraError = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff9db0;
`;

const ComposerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const ComposerTitle = styled.h2`
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const ComposerText = styled.textarea`
  width: 100%;
  min-height: 130px;
  resize: vertical;
  border-radius: 0;
  clip-path: polygon(2% 0, 100% 0, 98% 100%, 0 100%);
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  color: ${({ theme }) => theme.colors.text};
  padding: 11px;
`;

const FileInput = styled.input`
  display: block;
  width: 100%;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.text};
`;

const Preview = styled.div`
  margin-top: 10px;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 12px;
  padding: 10px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(9, 12, 17, 0.82)'};
`;

const CancelPublishButton = styled.button`
  margin-top: 12px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px;
  cursor: pointer;
`;

const PublishButton = styled.button`
  margin-top: 12px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 12px;
  cursor: pointer;
`;

const EmptyState = styled.p`
  text-align: center;
  opacity: 0.78;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 18px;
`;

const apiHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const postTypeLabel = (type) => {
  if (type === 'image') return 'foto';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  return 'texto';
};

const composerTitleByType = (type) => {
  if (type === 'photo') return 'cabina visual';
  if (type === 'video') return 'cabina video';
  if (type === 'song') return 'cabina audio';
  return 'bit de texto';
};

export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appTheme } = useSkin();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [publishType, setPublishType] = useState('text');
  const [draftText, setDraftText] = useState('');
  const [draftFile, setDraftFile] = useState(null);
  const [draftTrackId, setDraftTrackId] = useState(null);
  const [playingTrackPostId, setPlayingTrackPostId] = useState(null);
  const trackAudioRef = useRef(null);
  const [filePreview, setFilePreview] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editRemoveMedia, setEditRemoveMedia] = useState(false);
  const [creatorModeIndex, setCreatorModeIndex] = useState(0);
  const [creatorToolsVisible, setCreatorToolsVisible] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const creatorTouchStartRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('compose') !== '1') {
      return;
    }

    const requestedMode = params.get('mode');
    setPublishType(requestedMode === 'diary' ? 'diary' : 'photo');
    setComposerOpen(true);
    setCreatorModeIndex(0);

    params.delete('compose');
    params.delete('mode');
    const nextQuery = params.toString();
    navigate(`${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const layoutTemplate = appTheme.profile?.layoutTemplate || 'classic';

  useEffect(() => () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
  }, [filePreview]);

  useEffect(() => () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const ecos = useMemo(() => {
    const byOwner = [];
    const ownerSet = new Set();

    for (const post of posts) {
      const username = post.owner_username || 'anon';
      if (!ownerSet.has(username)) {
        ownerSet.add(username);
        byOwner.push({
          username,
          initial: username.charAt(0).toUpperCase()
        });
      }
      if (byOwner.length >= 10) {
        break;
      }
    }

    return byOwner;
  }, [posts]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/posts/?limit=50', {
        headers: apiHeaders()
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar el feed');
      }
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openComposer = (type) => {
    setPublishType(type);
    setComposerOpen(true);
    setCreatorModeIndex(0);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setDraftText('');
    setDraftFile(null);
    setDraftTrackId(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview('');
    setSending(false);
    setCameraReady(false);
    setCameraError('');
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador no permite cámara en este modo.');
      return;
    }

    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setCameraError('');
    } catch {
      setCameraReady(false);
      setCameraError('No se pudo abrir la cámara. Revisa permisos del navegador.');
    }
  };

  const switchCreatorMode = (delta) => {
    setCreatorModeIndex((prev) => {
      const total = CREATOR_MODES.length;
      return (prev + delta + total) % total;
    });
  };

  const onCreatorTouchStart = (event) => {
    creatorTouchStartRef.current = event.touches?.[0]?.clientY || null;
  };

  const onCreatorTouchEnd = (event) => {
    const start = creatorTouchStartRef.current;
    const end = event.changedTouches?.[0]?.clientY;
    creatorTouchStartRef.current = null;
    if (start == null || end == null) return;

    const delta = end - start;
    if (Math.abs(delta) < 24) return;
    switchCreatorMode(delta < 0 ? 1 : -1);
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setDraftFile(nextFile);

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    if (nextFile) {
      setFilePreview(URL.createObjectURL(nextFile));
    } else {
      setFilePreview('');
    }
  };

  const toggleTrackPlayback = (post) => {
    const audioEl = trackAudioRef.current;
    if (!audioEl || !post.track_media_url) return;
    if (playingTrackPostId === post.id) {
      audioEl.pause();
      setPlayingTrackPostId(null);
      return;
    }
    audioEl.src = post.track_media_url;
    audioEl.play();
    setPlayingTrackPostId(post.id);
  };

  const applyEditedFile = (editedFile, { trackId } = {}) => {
    setDraftFile(editedFile);
    setDraftTrackId(trackId || null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(URL.createObjectURL(editedFile));
    setEditorOpen(false);
  };

  const publishPost = async (event) => {
    event.preventDefault();

    const isDiary = publishType === 'diary';
    const needsFile = !isDiary;
    if (needsFile && !draftFile) return;

    setSending(true);
    const formData = new FormData();
    const content = isDiary
      ? (draftText.trim() || 'Entrada de diario')
      : draftText;
    formData.append('content', content);
    formData.append('is_public', 'true');
    if (draftFile) {
      formData.append('file', draftFile);
    }
    if (draftTrackId) {
      formData.append('track_id', String(draftTrackId));
    }

    try {
      const res = await fetch('/api/v1/posts/', {
        method: 'POST',
        headers: apiHeaders(),
        body: formData
      });

      if (!res.ok) {
        throw new Error('No se pudo publicar');
      }

      await loadPosts();
      closeComposer();
    } catch (error) {
      console.error(error);
      setSending(false);
    }
  };

  const toggleLike = async (postId) => {
    // Optimistic flip so the tap feels instant; reconciled with the real
    // count/state from the backend right after (or reverted on failure).
    setPosts((prev) => prev.map((p) => (
      p.id === postId
        ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
        : p
    )));

    try {
      const { data } = await api.post(`/posts/${postId}/like`);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
    } catch {
      // revert the optimistic flip
      setPosts((prev) => prev.map((p) => (
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
          : p
      )));
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      const { data } = await api.post(`/comments/${commentId}/like`);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? data : c))
      }));
    } catch {
      // leave state unchanged on failure
    }
  };

  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setEditDraft(post.content || '');
    setEditFile(null);
    setEditRemoveMedia(false);
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditDraft('');
    setEditFile(null);
    setEditRemoveMedia(false);
  };

  const saveEditPost = async (postId) => {
    const form = new FormData();
    form.append('content', editDraft.trim());
    if (editFile) {
      form.append('file', editFile);
    } else if (editRemoveMedia) {
      form.append('remove_media', 'true');
    }

    try {
      const { data } = await api.put(`/posts/${postId}`, form);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
      cancelEditPost();
    } catch {
      window.alert('No se pudo guardar la edición. Inténtalo de nuevo.');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('¿Borrar esta publicación? No se puede deshacer.')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      window.alert('No se pudo borrar la publicación. Inténtalo de nuevo.');
    }
  };

  const toggleComments = async (postId) => {
    const nextOpen = !openComments[postId];
    setOpenComments((prev) => ({
      ...prev,
      [postId]: nextOpen
    }));

    if (!nextOpen || commentsByPost[postId]) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        headers: apiHeaders()
      });
      if (!res.ok) {
        throw new Error('No se pudieron cargar comentarios');
      }
      const data = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: data
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const submitComment = async (postId, event) => {
    event.preventDefault();
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          ...apiHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      if (!res.ok) {
        throw new Error('No se pudo comentar');
      }

      const newComment = await res.json();
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
      }));
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: ''
      }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="chaplin-page-frame">
      <Shell className="chaplin-page-shell">
      <FeedGrid $layoutTemplate={layoutTemplate}>
      <FeedLeftRail $visible={['studio','terminal','edge','collector','arcade'].includes(layoutTemplate)}>
        <SidePanel className="chaplin-theme-panel">
          <EcosTitle>Ecos</EcosTitle>
          <EcosRail>
            <EcoShard type="button" onClick={() => openComposer('photo')}>
              <EcoCore>+</EcoCore>
              <EcoLabel>tu eco</EcoLabel>
            </EcoShard>

            {ecos.map((eco) => (
              <EcoShard
                key={eco.username}
                type="button"
                onClick={() => navigate(`/profile/${eco.username}`)}
              >
                <EcoCore>{eco.initial}</EcoCore>
                <EcoLabel>@{eco.username}</EcoLabel>
              </EcoShard>
            ))}
          </EcosRail>
        </SidePanel>
      </FeedLeftRail>

      <FeedCenter>
      <TopBanner className="chaplin-theme-panel">
        <FeedTitle>Chaplin Main Grid</FeedTitle>
        <FeedSubtitle>Neon social chassis / y2k cyberchrome stream</FeedSubtitle>
      </TopBanner>

      <Stack>
        {!loading && posts.length === 0 && (
          <EmptyState>No hay publicaciones todavia. Inicia la primera transmision.</EmptyState>
        )}

        {posts.map((post) => {
          const type = post.media_type || 'text';
          const postComments = commentsByPost[post.id] || [];

          return (
            <Card className="chaplin-theme-panel" key={post.id}>
              <CardHeader>
                <MediaType>{postTypeLabel(type)}</MediaType>
                {post.owner_username ? (
                  <AuthorButton
                    type="button"
                    onClick={() => navigate(`/profile/${post.owner_username}`)}
                  >
                    @{post.owner_username}
                  </AuthorButton>
                ) : (
                  <AuthorButton type="button">@anon</AuthorButton>
                )}
              </CardHeader>

              {type === 'image' && post.media_url && <MediaImg src={post.media_url} alt="post" />}
              {type === 'video' && post.media_url && <MediaVideo src={post.media_url} controls />}

              {post.track_media_url && (
                <TrackBadge type="button" onClick={() => toggleTrackPlayback(post)}>
                  {playingTrackPostId === post.id ? <Pause size={12} /> : <Play size={12} />}
                  {post.track_title || 'cancion'}
                </TrackBadge>
              )}

              <CardContent>
                {type === 'text' && (
                  <DiaryNotice>
                    @{post.owner_username || 'anon'} ha escrito en su diario.
                  </DiaryNotice>
                )}
                {type === 'audio' && post.media_url && <MediaAudio src={post.media_url} controls />}
                {editingPostId === post.id ? (
                  <CommentForm onSubmit={(event) => { event.preventDefault(); saveEditPost(post.id); }}>
                    <CommentInput
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      autoFocus
                    />
                    {post.media_url && !editFile && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={editRemoveMedia}
                          onChange={(event) => setEditRemoveMedia(event.target.checked)}
                        />
                        Quitar archivo adjunto
                      </label>
                    )}
                    <FileInput
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={(event) => {
                        setEditFile(event.target.files?.[0] || null);
                        setEditRemoveMedia(false);
                      }}
                    />
                    {editFile && <span style={{ fontSize: 12, opacity: 0.8 }}>Nuevo archivo: {editFile.name}</span>}
                    <ActionButton type="submit">Guardar</ActionButton>
                    <ActionButton type="button" onClick={cancelEditPost}>Cancelar</ActionButton>
                  </CommentForm>
                ) : (
                  post.content && <TextBody>{post.content}</TextBody>
                )}
              </CardContent>

              <ActionRow>
                <ActionButton type="button" onClick={() => toggleLike(post.id)}>
                  <HarlequinMask $active={Boolean(post.liked_by_me)}>
                    <HarlequinFace />
                    <HarlequinSmile />
                    <HarlequinTear />
                  </HarlequinMask>
                  ovacion {post.like_count || 0}
                </ActionButton>

                <ActionButton type="button" onClick={() => toggleComments(post.id)}>
                  <MessageCircle size={14} />
                  ecochat
                </ActionButton>

                <ActionButton
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(window.location.href)}
                >
                  <Send size={14} />
                  relay
                </ActionButton>

                {user && post.owner_id === user.id && editingPostId !== post.id && (
                  <>
                    <ActionButton type="button" onClick={() => startEditPost(post)}>
                      editar
                    </ActionButton>
                    <ActionButton type="button" onClick={() => deletePost(post.id)}>
                      borrar
                    </ActionButton>
                  </>
                )}
              </ActionRow>

              {openComments[post.id] && (
                <CommentBox>
                  <CommentList>
                    {postComments.map((comment) => (
                      <CommentItem key={comment.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                          <div>
                            {comment.owner_username && (
                              <strong style={{ marginRight: 6 }}>@{comment.owner_username}</strong>
                            )}
                            {comment.content}
                          </div>
                          <ActionButton
                            type="button"
                            onClick={() => toggleCommentLike(post.id, comment.id)}
                            style={{ flexShrink: 0 }}
                          >
                            ♥ {comment.like_count || 0}
                          </ActionButton>
                        </div>
                      </CommentItem>
                    ))}
                  </CommentList>

                  <CommentForm onSubmit={(event) => submitComment(post.id, event)}>
                    <CommentInput
                      placeholder="inyecta texto al canal..."
                      value={commentDrafts[post.id] || ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post.id]: value
                        }));
                      }}
                    />
                    <ActionButton type="submit">send</ActionButton>
                  </CommentForm>
                </CommentBox>
              )}
            </Card>
          );
        })}
      </Stack>
      <audio ref={trackAudioRef} onEnded={() => setPlayingTrackPostId(null)} style={{ display: 'none' }} />
      </FeedCenter>

      <FeedRightRail
        $visible={['studio','terminal','edge','collector','arcade'].includes(layoutTemplate)}
        $mobileVisible={['edge','studio','collector','arcade'].includes(layoutTemplate)}
      >
        <SidePanel className="chaplin-theme-panel">
          <SideTitle>Publicar</SideTitle>
          <ActionButton type="button" onClick={() => openComposer('photo')}>
            <PlusSquare size={14} />
            foto
          </ActionButton>
          <ActionButton type="button" onClick={() => openComposer('video')}>
            <Video size={14} />
            video
          </ActionButton>
          <ActionButton type="button" onClick={() => openComposer('song')}>
            <Music size={14} />
            audio
          </ActionButton>
          <ActionButton type="button" onClick={() => openComposer('diary')}>
            <BookOpen size={14} />
            diario
          </ActionButton>
        </SidePanel>
      </FeedRightRail>
      </FeedGrid>

      {composerOpen && createPortal(
        <ComposerBackdrop>
          <CreatorShell className="chaplin-theme-panel" onSubmit={publishPost}>
            <CreatorTopBar>
              <ComposerTitle>
                <Camera size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                publicar studio / {CREATOR_MODES[creatorModeIndex]}
              </ComposerTitle>
              <ActionButton type="button" onClick={closeComposer}>
                <X size={14} />
              </ActionButton>
            </CreatorTopBar>

            <CreatorStage>
              {cameraReady ? (
                <CameraPreview ref={cameraVideoRef} autoPlay muted playsInline />
              ) : filePreview ? (
                publishType === 'video' ? (
                  <MediaVideo src={filePreview} controls />
                ) : publishType === 'song' ? (
                  <CameraPlaceholder>
                    <div>
                      <Music size={28} style={{ marginBottom: 8 }} />
                      <p>Audio listo para publicar</p>
                    </div>
                  </CameraPlaceholder>
                ) : (
                  <MediaImg src={filePreview} alt="preview foto" />
                )
              ) : (
                <CameraPlaceholder>
                  <div>
                    <Camera size={28} style={{ marginBottom: 8 }} />
                    <p>Abre cámara o sube un archivo para publicar.</p>
                  </div>
                </CameraPlaceholder>
              )}

              {creatorToolsVisible && (
                <CreatorTools>
                  <ToolButton
                    type="button"
                    $active={publishType === 'photo'}
                    onClick={() => setPublishType('photo')}
                  >
                    <Image size={18} />
                  </ToolButton>

                  <ToolButton
                    type="button"
                    $active={publishType === 'video'}
                    onClick={() => setPublishType('video')}
                  >
                    <Video size={18} />
                  </ToolButton>

                  <ToolButton
                    type="button"
                    $active={publishType === 'song'}
                    onClick={() => setPublishType('song')}
                  >
                    <Music size={18} />
                  </ToolButton>

                  <ToolButton
                    type="button"
                    disabled={!draftFile || publishType === 'song'}
                    onClick={() => setEditorOpen(true)}
                  >
                    <Sliders size={18} />
                  </ToolButton>
                </CreatorTools>
              )}

              <DiaryWidget type="button" onClick={() => setPublishType('diary')}>
                <BookOpen size={14} />
                querido diario
              </DiaryWidget>

              <CreatorModeRail
                onTouchStart={onCreatorTouchStart}
                onTouchEnd={onCreatorTouchEnd}
                onWheel={(event) => {
                  if (event.deltaY > 0) switchCreatorMode(1);
                  if (event.deltaY < 0) switchCreatorMode(-1);
                }}
              >
                {CREATOR_MODES.map((mode, index) => (
                  <ModeItem key={mode} $active={creatorModeIndex === index}>
                    {mode}
                  </ModeItem>
                ))}
              </CreatorModeRail>
            </CreatorStage>

            <CreatorFooter>
              <ActionButton type="button" onClick={startCamera}>
                <Camera size={14} />
                {cameraReady ? 'reiniciar camara' : 'abrir camara'}
              </ActionButton>

              <ActionButton type="button" onClick={() => setCreatorToolsVisible((prev) => !prev)}>
                {creatorToolsVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                {creatorToolsVisible ? 'ocultar iconos' : 'mostrar iconos'}
              </ActionButton>

              {(publishType === 'photo' || publishType === 'video' || publishType === 'song') ? (
                <FileInput type="file" accept={publishType === 'photo' ? 'image/*' : publishType === 'video' ? 'video/*' : 'audio/*'} onChange={handleFileChange} />
              ) : (
                <ActionButton type="button" onClick={() => setPublishType('diary')}>
                  <BookOpen size={14} />
                  modo diario
                </ActionButton>
              )}

              {draftTrackId && (
                <ActionButton type="button" onClick={() => setDraftTrackId(null)}>
                  <Music size={14} />
                  quitar cancion
                </ActionButton>
              )}

              <CancelPublishButton type="button" onClick={closeComposer} disabled={sending}>
                cancelar
              </CancelPublishButton>

              <PublishButton type="submit" disabled={sending}>
                {sending ? 'publicando...' : 'confirmar publicacion'}
              </PublishButton>
            </CreatorFooter>

            {cameraError && <CameraError>{cameraError}</CameraError>}
          </CreatorShell>

          {editorOpen && draftFile && (publishType === 'photo' || publishType === 'video') && (
            <MediaEditor
              file={draftFile}
              mediaType={publishType}
              initialTrackId={draftTrackId}
              onApply={applyEditedFile}
              onClose={() => setEditorOpen(false)}
            />
          )}
        </ComposerBackdrop>,
        document.body
      )}
      </Shell>
    </div>
  );
}
