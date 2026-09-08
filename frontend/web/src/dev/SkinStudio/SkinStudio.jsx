import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import GenericPlayerEngine from './GenericPlayerEngine';

/*
 * SKIN STUDIO — real visual editor for Winamp-style player skins.
 *
 * Fixes the actual problem this tool exists to fix: an LLM guessing pixel
 * coordinates for hundreds of assets across a dozen players is unreliable.
 * This editor lets a human drag/resize/layer real assets on a real canvas,
 * and SAVES FOR REAL — a POST to a dev-only Vite middleware
 * (vite.config.js's skinStudioDevApi) writes manifest.json straight to
 * disk in the exact schema BubblegumGlossSkin.jsx / render_from_manifest.py
 * already read (assets[]: id/file/type/x/y/width/height/zIndex/
 * interactive/action/recolorGroup) — never "copy this from the console".
 *
 * Included: drag, resize, zoom, layers (reorder/hide/lock), an asset
 * library sourced from the player's real files on disk, functional zones
 * (time/title/progress/spectrum/volume) that render LIVE in Preview mode
 * via GenericPlayerEngine + a real <audio> + Web Audio AnalyserNode,
 * keyboard nudge, undo/redo, autosave-on-idle.
 *
 * Not yet included (tell me if you want these next): hover/pressed asset
 * states, snapping guides, multi-select, canvas rulers.
 */

const ASSET_URL_MAP = import.meta.glob('../../assets/profilePlayers/**/*.{png,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' });
function assetUrlFor(playerId, relFile) {
  const key = `../../assets/profilePlayers/${playerId}/${relFile}`;
  return ASSET_URL_MAP[key] || '';
}

const API = '/__skin_studio';
async function apiGet(path) { const r = await fetch(`${API}${path}`); return r.json(); }
async function apiPost(path, body) { const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

const FUNCTIONAL_TYPES = [
  { type: 'functional-time', label: '+ Time', w: 70, h: 16, color: '#ffffff' },
  { type: 'functional-title', label: '+ Title', w: 160, h: 20, color: '#ffffff' },
  { type: 'functional-progress', label: '+ Progress', w: 200, h: 8, color: '#5ad4f5' },
  { type: 'functional-spectrum', label: '+ Spectrum', w: 120, h: 40, color: '#5ad4f5', bands: 12 },
  { type: 'functional-volume-track', label: '+ Volume track', w: 100, h: 8, color: '#5ad4f5' },
  { type: 'functional-volume-thumb', label: '+ Volume thumb', w: 14, h: 14, color: '#ffffff' },
];

const ACTION_OPTIONS = ['', 'previous', 'play', 'pause', 'next', 'toggle-play', 'favorite'];
const TYPE_OPTIONS = ['screen', 'control', 'decoration', 'slider', 'shell', ...FUNCTIONAL_TYPES.map((f) => f.type)];

// Chaplin's app shell wraps every route in a fixed-width "mobile frame"
// container. A drag/resize design tool needs real desktop width — this
// breaks out of that ancestor constraint with a full-viewport fixed
// overlay, regardless of what wraps it in the component tree.
const Shell = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100000;
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  grid-template-rows: 48px 1fr 200px;
  grid-template-areas: "toolbar toolbar toolbar" "assets canvas props" "assets layers props";
  background: #17181d;
  color: #e8e8ee;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 12.5px;
`;

const Toolbar = styled.div`
  grid-area: toolbar;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  background: #1f2027;
  border-bottom: 1px solid #2c2d36;
`;

const Panel = styled.div`
  overflow: auto;
  background: #1b1c22;
`;

const AssetsPanel = styled(Panel)` grid-area: assets; border-right: 1px solid #2c2d36; padding: 10px; `;
const CanvasPanel = styled(Panel)` grid-area: canvas; display: flex; align-items: center; justify-content: center; background: #0e0f13; position: relative; `;
const PropsPanel = styled(Panel)` grid-area: props; border-left: 1px solid #2c2d36; padding: 10px; `;
const LayersPanel = styled(Panel)` grid-area: layers; border-right: 1px solid #2c2d36; border-top: 1px solid #2c2d36; padding: 8px; `;

const Btn = styled.button`
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #3a3b45;
  background: ${(p) => (p.$active ? '#2b5f8a' : '#25262e')};
  color: #e8e8ee;
  cursor: pointer;
  font-size: 12px;
  &:hover { background: #2f3038; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Input = styled.input`
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #3a3b45;
  background: #101116;
  color: #e8e8ee;
  font-size: 12px;
`;

const Select = styled.select`
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #3a3b45;
  background: #101116;
  color: #e8e8ee;
  font-size: 12px;
`;

const Field = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #9a9ba8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const AssetThumb = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 5px;
  cursor: grab;
  &:hover { background: #26272f; }
  img { width: 28px; height: 28px; object-fit: contain; background: repeating-conic-gradient(#2a2b32 0% 25%, #202126 0% 50%) 0 0/8px 8px; border-radius: 3px; }
  span { font-size: 11px; word-break: break-all; }
`;

const LayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  background: ${(p) => (p.$selected ? '#2b5f8a55' : 'transparent')};
  cursor: pointer;
  font-size: 11.5px;
  opacity: ${(p) => (p.$hidden ? 0.4 : 1)};
  &:hover { background: ${(p) => (p.$selected ? '#2b5f8a66' : '#24252c')}; }
`;

const CanvasStage = styled.div`
  position: relative;
  background-image:
    linear-gradient(45deg, #202128 25%, transparent 25%), linear-gradient(-45deg, #202128 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #202128 75%), linear-gradient(-45deg, transparent 75%, #202128 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: #16171c;
  outline: 1px solid #3a3b45;
`;

const ElBox = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: ${(p) => (p.$selected ? '1.5px solid #5ad4f5' : p.$hidden ? '1px dashed #555' : '1px dashed rgba(255,255,255,0.25)')};
  cursor: ${(p) => (p.$locked ? 'default' : 'move')};
  img { width: 100%; height: 100%; object-fit: fill; display: block; pointer-events: none; }
`;

const FunctionalBox = styled.div`
  width: 100%; height: 100%;
  background: ${(p) => p.$color}22;
  border: 1px dashed ${(p) => p.$color};
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: ${(p) => p.$color}; text-align: center; overflow: hidden;
`;

const ResizeHandle = styled.div`
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 9px;
  height: 9px;
  background: #5ad4f5;
  border: 1px solid #0e0f13;
  border-radius: 2px;
  cursor: nwse-resize;
`;

let uid = 0;
function makeId(base) {
  uid += 1;
  return `${base}-${uid}`;
}

export default function SkinStudio() {
  const { playerId: routePlayerId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(routePlayerId || '');
  const [manifest, setManifest] = useState(null);
  const [assetFiles, setAssetFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('edit');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [newPlayerName, setNewPlayerName] = useState('');
  // Baseline size the resize SLIDER scales from (100%) — recaptured only
  // when the SELECTION changes, so dragging the slider back and forth
  // (or editing Width/Height directly in between) always scales relative
  // to a stable reference instead of compounding drift.
  const [sizeBase, setSizeBase] = useState(null);

  const dragRef = useRef(null);
  const audioRef = useRef(null);
  const [demo, setDemo] = useState({ isPlaying: false, isActive: true, currentTime: 0, duration: 0, volume: 0.8, isFavorited: false });

  useEffect(() => { apiGet('/players').then((d) => setPlayers(d.players || [])); }, []);

  // Legacy manifests (e.g. bubblegum-gloss) may carry BOTH the original
  // sourceSheetPosition (asset.x/y, from asset-sheet extraction) AND an
  // assembledPlayerCoordinates.positions override. Skin Studio edits ONE
  // flat set of positions — on load, flatten APC over sourceSheetPosition
  // so the editor shows exactly what's currently rendered; on save, both
  // asset.x/y and assembledPlayerCoordinates.positions are written back
  // in sync so every consumer (old or new) resolves to the same place.
  const loadPlayer = useCallback((id) => {
    if (!id) return;
    Promise.all([apiGet(`/assets?player=${id}`), apiGet(`/manifest?player=${id}`)]).then(([assetsRes, manifestRes]) => {
      setAssetFiles(assetsRes.assets || []);
      let m = manifestRes.manifest || { id, label: id, canvas: { width: 480, height: 400 }, assets: [] };
      const apc = m.assembledPlayerCoordinates;
      if (apc?.available) {
        m = {
          ...m,
          canvas: apc.canvas,
          assets: m.assets.map((a) => ({ ...a, ...(apc.positions[a.id] ? { x: apc.positions[a.id].x, y: apc.positions[a.id].y } : {}) })),
        };
      }
      setManifest(m);
      setHistory([m]);
      setHistoryIndex(0);
      setSelectedId(null);
      setDirty(false);
    });
  }, []);

  useEffect(() => { if (playerId) loadPlayer(playerId); }, [playerId, loadPlayer]);

  useEffect(() => {
    if (!selectedId || !manifest) { setSizeBase(null); return; }
    const a = manifest.assets.find((x) => x.id === selectedId);
    if (a) setSizeBase({ width: a.width, height: a.height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const pushHistory = useCallback((next) => {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      const nh = [...trimmed, next].slice(-60);
      setHistoryIndex(nh.length - 1);
      return nh;
    });
  }, [historyIndex]);

  const updateManifest = useCallback((updater, { record = true } = {}) => {
    setManifest((m) => {
      const next = updater(m);
      if (record) pushHistory(next);
      setDirty(true);
      return next;
    });
  }, [pushHistory]);

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setManifest(history[historyIndex - 1]); setDirty(true); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setManifest(history[historyIndex + 1]); setDirty(true); } };

  const selectPlayer = (id) => { setPlayerId(id); navigate(`/dev/skin-studio/${id}`); };

  const createPlayer = async () => {
    const id = newPlayerName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!id) return;
    await fetch(`${API}/create_player?player=${id}`, { method: 'POST' });
    setPlayers((p) => [...new Set([...p, id])]);
    setNewPlayerName('');
    selectPlayer(id);
  };

  const save = async () => {
    if (!manifest) return;
    setSaving(true);
    // Keep assembledPlayerCoordinates in sync with the flat assets[].x/y
    // this editor works on, so legacy readers that prefer APC (and new
    // ones that don't) both resolve to the same position.
    const positions = {};
    manifest.assets.forEach((a) => { positions[a.id] = { x: a.x, y: a.y }; });
    const toSave = {
      ...manifest,
      assembledPlayerCoordinates: {
        available: true,
        canvas: manifest.canvas,
        referenceSource: manifest.assembledPlayerCoordinates?.referenceSource || 'Positioned in Skin Studio (/dev/skin-studio) — a real visual editor, not LLM-guessed coordinates.',
        note: 'positions below are edited directly in Skin Studio and kept in sync with each asset\'s own x/y.',
        positions,
      },
    };
    await apiPost(`/manifest?player=${playerId}`, toSave);
    setSaving(false);
    setDirty(false);
  };

  // autosave 2.5s after the last change
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(save, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, manifest]);

  const addAssetFromFile = (file) => {
    const url = assetUrlFor(playerId, file);
    const img = new Image();
    img.onload = () => {
      const base = file.split('/').pop().replace(/\.[^.]+$/, '');
      const newAsset = {
        id: makeId(base), file, type: file.includes('controls/') ? 'control' : file.includes('decoration/') ? 'decoration' : 'screen',
        x: 10, y: 10, width: img.naturalWidth, height: img.naturalHeight, zIndex: (manifest.assets.length ? Math.max(...manifest.assets.map((a) => a.zIndex || 0)) : 0) + 1,
        interactive: false, action: null, recolorGroup: null, notes: '',
      };
      updateManifest((m) => ({ ...m, assets: [...m.assets, newAsset] }));
      setSelectedId(newAsset.id);
    };
    img.src = url;
  };

  const addFunctional = (spec) => {
    const newAsset = {
      id: makeId(spec.type), file: null, type: spec.type,
      x: 10, y: 10, width: spec.w, height: spec.h, zIndex: (manifest.assets.length ? Math.max(...manifest.assets.map((a) => a.zIndex || 0)) : 0) + 1,
      interactive: false, action: null, recolorGroup: null, color: spec.color, bands: spec.bands, notes: '',
    };
    updateManifest((m) => ({ ...m, assets: [...m.assets, newAsset] }));
    setSelectedId(newAsset.id);
  };

  const selected = manifest?.assets.find((a) => a.id === selectedId) || null;

  const patchSelected = (patch, record = true) => {
    updateManifest((m) => ({ ...m, assets: m.assets.map((a) => (a.id === selectedId ? { ...a, ...patch } : a)) }), { record });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    updateManifest((m) => ({ ...m, assets: m.assets.filter((a) => a.id !== selectedId) }));
    setSelectedId(null);
  };

  const reorder = (dir) => {
    if (!selected) return;
    const sorted = [...manifest.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const idx = sorted.findIndex((a) => a.id === selectedId);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    const za = a.zIndex || 0, zb = b.zIndex || 0;
    updateManifest((m) => ({ ...m, assets: m.assets.map((x) => (x.id === a.id ? { ...x, zIndex: zb } : x.id === b.id ? { ...x, zIndex: za } : x)) }));
  };

  // ---- drag / resize ----
  const onElPointerDown = (e, asset, handleType) => {
    if (mode !== 'edit' || asset.locked) return;
    e.stopPropagation();
    setSelectedId(asset.id);
    dragRef.current = {
      handleType, id: asset.id, startX: e.clientX, startY: e.clientY,
      origX: asset.x, origY: asset.y, origW: asset.width, origH: asset.height,
    };
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
  };

  // IMPORTANT: these two do NOT read `selectedId` from their own closure —
  // window-level listeners registered once at pointerdown keep whatever
  // closure existed at that instant, which can be stale by the time the
  // event actually fires (React state updates are async). dragRef.current
  // is a ref (always current) and carries the dragged asset's own id, so
  // every update below is keyed off `d.id` directly instead.
  const onWindowPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    if (d.handleType === 'move') {
      const patch = { x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) };
      updateManifest((m) => ({ ...m, assets: m.assets.map((a) => (a.id === d.id ? { ...a, ...patch } : a)) }), { record: false });
    } else {
      const patch = { width: Math.max(4, Math.round(d.origW + dx)), height: Math.max(4, Math.round(d.origH + dy)) };
      updateManifest((m) => ({ ...m, assets: m.assets.map((a) => (a.id === d.id ? { ...a, ...patch } : a)) }), { record: false });
    }
  };
  const onWindowPointerUp = () => {
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    if (dragRef.current) { dragRef.current = null; updateManifest((m) => m); } // commit to history
  };

  // ---- keyboard nudge + undo/redo ----
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (!selected) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') { patchSelected({ x: selected.x - step }); e.preventDefault(); }
      if (e.key === 'ArrowRight') { patchSelected({ x: selected.x + step }); e.preventDefault(); }
      if (e.key === 'ArrowUp') { patchSelected({ y: selected.y - step }); e.preventDefault(); }
      if (e.key === 'ArrowDown') { patchSelected({ y: selected.y + step }); e.preventDefault(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, historyIndex, history]);

  // ---- demo audio wiring for Preview ----
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    const onTime = () => setDemo((s) => ({ ...s, currentTime: el.currentTime, duration: el.duration || 0 }));
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onTime);
    return () => { el.removeEventListener('timeupdate', onTime); el.removeEventListener('loadedmetadata', onTime); };
  }, [mode]);

  const engineAssetUrl = (file) => assetUrlFor(playerId, file);

  if (!playerId) {
    return (
      <Shell style={{ gridTemplateColumns: '1fr', gridTemplateAreas: '"toolbar" "canvas"' }}>
        <Toolbar><b>Skin Studio</b></Toolbar>
        <CanvasPanel style={{ flexDirection: 'column', gap: 16 }}>
          <div>Elige un player:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 600, justifyContent: 'center' }}>
            {players.map((p) => <Btn key={p} onClick={() => selectPlayer(p)}>{p}</Btn>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Input placeholder="nuevo-player-id" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} style={{ width: 220 }} />
            <Btn onClick={createPlayer}>Crear</Btn>
          </div>
        </CanvasPanel>
      </Shell>
    );
  }

  if (!manifest) return <Shell><Toolbar>Cargando {playerId}…</Toolbar></Shell>;

  const CW = manifest.canvas.width, CH = manifest.canvas.height;
  const sortedAssets = [...manifest.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <Shell onPointerDown={() => {}}>
      <Toolbar>
        <Btn onClick={() => navigate('/dev/skin-studio')}>◂ players</Btn>
        <b>{playerId}</b>
        <span style={{ color: '#666' }}>|</span>
        <Btn onClick={() => setZoom((z) => Math.max(0.25, z / 2))}>−</Btn>
        <span>{Math.round(zoom * 100)}%</span>
        <Btn onClick={() => setZoom((z) => Math.min(8, z * 2))}>+</Btn>
        <Btn onClick={() => setZoom(1)}>100%</Btn>
        <span style={{ color: '#666' }}>|</span>
        canvas
        <Input type="number" style={{ width: 60 }} value={CW} onChange={(e) => updateManifest((m) => ({ ...m, canvas: { ...m.canvas, width: Number(e.target.value) } }))} />
        ×
        <Input type="number" style={{ width: 60 }} value={CH} onChange={(e) => updateManifest((m) => ({ ...m, canvas: { ...m.canvas, height: Number(e.target.value) } }))} />
        <span style={{ color: '#666' }}>|</span>
        <Btn onClick={undo} disabled={historyIndex <= 0}>↶ undo</Btn>
        <Btn onClick={redo} disabled={historyIndex >= history.length - 1}>↷ redo</Btn>
        <span style={{ marginLeft: 'auto' }} />
        <Btn $active={mode === 'edit'} onClick={() => setMode('edit')}>EDIT</Btn>
        <Btn $active={mode === 'preview'} onClick={() => setMode('preview')}>PREVIEW</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Guardando…' : dirty ? 'Guardar ●' : 'Guardado ✓'}</Btn>
      </Toolbar>

      <AssetsPanel>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Assets ({assetFiles.length})</div>
        {assetFiles.map((f) => (
          <AssetThumb key={f} onClick={() => addAssetFromFile(f)} title={`Click para añadir: ${f}`}>
            <img src={engineAssetUrl(f)} alt="" />
            <span>{f}</span>
          </AssetThumb>
        ))}
        <div style={{ fontWeight: 700, margin: '14px 0 6px' }}>Zonas funcionales</div>
        {FUNCTIONAL_TYPES.map((spec) => (
          <Btn key={spec.type} style={{ display: 'block', width: '100%', marginBottom: 5, textAlign: 'left' }} onClick={() => addFunctional(spec)}>{spec.label}</Btn>
        ))}
      </AssetsPanel>

      <CanvasPanel>
        {mode === 'edit' ? (
          <CanvasStage style={{ width: CW * zoom, height: CH * zoom }} onPointerDown={() => setSelectedId(null)}>
            {sortedAssets.map((a) => {
              const url = a.file ? engineAssetUrl(a.file) : null;
              return (
                <ElBox
                  key={a.id}
                  $selected={a.id === selectedId}
                  $hidden={a.hidden}
                  $locked={a.locked}
                  style={{ left: a.x * zoom, top: a.y * zoom, width: a.width * zoom, height: a.height * zoom, zIndex: a.zIndex || 0, display: a.hidden ? 'none' : 'block' }}
                  onPointerDown={(e) => onElPointerDown(e, a, 'move')}
                >
                  {url ? <img src={url} alt="" /> : (
                    <FunctionalBox $color={a.color || '#5ad4f5'}>{a.type.replace('functional-', '')}</FunctionalBox>
                  )}
                  {a.id === selectedId && !a.locked && (
                    <ResizeHandle onPointerDown={(e) => onElPointerDown(e, a, 'resize')} />
                  )}
                </ElBox>
              );
            })}
          </CanvasStage>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <GenericPlayerEngine
              manifest={manifest}
              assetUrl={engineAssetUrl}
              track={{ id: 'demo', title: 'Demo Track — Skin Studio', owner_username: 'chaplin_lab' }}
              isActive={demo.isActive}
              isPlaying={demo.isPlaying}
              hasQueue
              onTogglePlay={() => { const el = audioRef.current; if (!el) return; if (el.paused) { el.play(); setDemo((s) => ({ ...s, isPlaying: true })); } else { el.pause(); setDemo((s) => ({ ...s, isPlaying: false })); } }}
              onPrev={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }}
              onNext={() => { if (audioRef.current) audioRef.current.currentTime = (audioRef.current.currentTime || 0) + 10; }}
              onSeek={(t) => { if (audioRef.current) audioRef.current.currentTime = t; }}
              onVolumeChange={(v) => { if (audioRef.current) audioRef.current.volume = v; setDemo((s) => ({ ...s, volume: v })); }}
              currentTime={demo.currentTime}
              duration={demo.duration}
              volume={demo.volume}
              isFavorited={demo.isFavorited}
              onToggleFavorite={() => setDemo((s) => ({ ...s, isFavorited: !s.isFavorited }))}
              audioElRef={audioRef}
              maxWidth={520}
            />
            <audio ref={audioRef} src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" crossOrigin="anonymous" style={{ width: 320 }} controls />
            <div style={{ color: '#888', fontSize: 11 }}>Audio de demo (SoundHelix) solo para probar animaciones — el player real usa el audio de Chaplin.</div>
          </div>
        )}
      </CanvasPanel>

      <LayersPanel>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Capas</div>
        {[...sortedAssets].reverse().map((a) => (
          <LayerRow key={a.id} $selected={a.id === selectedId} $hidden={a.hidden} onClick={() => setSelectedId(a.id)}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.id} <span style={{ color: '#777' }}>({a.type})</span></span>
            <button type="button" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); updateManifest((m) => ({ ...m, assets: m.assets.map((x) => (x.id === a.id ? { ...x, hidden: !x.hidden } : x)) })); }}>{a.hidden ? '🚫' : '👁'}</button>
            <button type="button" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); updateManifest((m) => ({ ...m, assets: m.assets.map((x) => (x.id === a.id ? { ...x, locked: !x.locked } : x)) })); }}>{a.locked ? '🔒' : '🔓'}</button>
          </LayerRow>
        ))}
      </LayersPanel>

      <PropsPanel>
        {!selected ? <div style={{ color: '#777' }}>Selecciona un elemento</div> : (
          <>
            <Field>ID<Input value={selected.id} onChange={(e) => { const newId = e.target.value; updateManifest((m) => ({ ...m, assets: m.assets.map((a) => (a.id === selected.id ? { ...a, id: newId } : a)) })); setSelectedId(newId); }} /></Field>
            <Field>Archivo<Input value={selected.file || '(ninguno — zona funcional)'} disabled /></Field>
            <Field>Tipo
              <Select value={selected.type} onChange={(e) => patchSelected({ type: e.target.value })}>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field>X<Input type="number" value={selected.x} onChange={(e) => patchSelected({ x: Number(e.target.value) })} /></Field>
              <Field>Y<Input type="number" value={selected.y} onChange={(e) => patchSelected({ y: Number(e.target.value) })} /></Field>
              <Field>Width<Input type="number" value={selected.width} onChange={(e) => patchSelected({ width: Number(e.target.value) })} /></Field>
              <Field>Height<Input type="number" value={selected.height} onChange={(e) => patchSelected({ height: Number(e.target.value) })} /></Field>
            </div>
            {sizeBase && (
              <Field>
                Tamaño ({Math.round((selected.width / Math.max(1, sizeBase.width)) * 100)}%)
                <input
                  type="range" min="10" max="400" step="1"
                  value={Math.round((selected.width / Math.max(1, sizeBase.width)) * 100)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    patchSelected({
                      width: Math.max(2, Math.round(sizeBase.width * (pct / 100))),
                      height: Math.max(2, Math.round(sizeBase.height * (pct / 100))),
                    });
                  }}
                  style={{ width: '100%' }}
                />
              </Field>
            )}
            <Field>Z-index
              <div style={{ display: 'flex', gap: 6 }}>
                <Input type="number" value={selected.zIndex || 0} onChange={(e) => patchSelected({ zIndex: Number(e.target.value) })} />
                <Btn onClick={() => reorder(1)}>↑ front</Btn>
                <Btn onClick={() => reorder(-1)}>↓ back</Btn>
              </div>
            </Field>
            {selected.type === 'control' && (
              <Field>Acción
                <Select value={selected.action || ''} onChange={(e) => patchSelected({ action: e.target.value || null, interactive: !!e.target.value })}>
                  {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a || '(ninguna)'}</option>)}
                </Select>
              </Field>
            )}
            {selected.type.startsWith('functional-') && (
              <Field>Color<Input type="color" value={selected.color || '#5ad4f5'} onChange={(e) => patchSelected({ color: e.target.value })} /></Field>
            )}
            {selected.type === 'functional-spectrum' && (
              <Field>Bandas<Input type="number" value={selected.bands || 12} onChange={(e) => patchSelected({ bands: Number(e.target.value) })} /></Field>
            )}
            <Field>Recolor group<Input value={selected.recolorGroup || ''} onChange={(e) => patchSelected({ recolorGroup: e.target.value || null })} /></Field>
            <Field>Notas<Input value={selected.notes || ''} onChange={(e) => patchSelected({ notes: e.target.value })} /></Field>
            <Btn style={{ background: '#5a1f1f', width: '100%' }} onClick={deleteSelected}>Eliminar elemento</Btn>
          </>
        )}
      </PropsPanel>
    </Shell>
  );
}
