import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Wand2 } from 'lucide-react';
import MediaEditor from '../components/MediaEditor';
import { Z_INDEX } from '../styles/zIndexScale';

// Portfolio tool for Dibujante/Tatuador — same shape as CreateVisual.jsx
// (Fotografía/Cine), simplified: this role's work is always a static image
// (no video choice needed), and the technique vocabulary is medium/style
// instead of photo/film genres. Same reuse: MediaEditor for real editing,
// hashtags in `content` for technique + a "disponible para encargos" tag,
// then the exact same draft handoff to the existing Publish.jsx — zero
// backend changes.
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

const FileInput = styled.input`
  border: 1px dashed ${({ theme }) => theme.card?.border || theme.colors.border};
  border-radius: 12px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  color: inherit;
`;

const Preview = styled.div`
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);

  img {
    display: block;
    width: 100%;
    max-height: 360px;
    object-fit: contain;
  }
`;

const SectionLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button`
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.card?.border || theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.accentSoft : 'transparent')};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
`;

const NextButton = styled.button`
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: #05070b;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const EditBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const TECHNIQUES = ['Acuarela', 'Tinta', 'Digital', 'Óleo', 'Acrílico', 'Grafito', 'Tatuaje tradicional', 'Tatuaje realista', 'Blackwork'];
const COMMISSION_TAG = 'DisponibleParaEncargos';

export default function CreatePortfolio() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [techniques, setTechniques] = useState(new Set());
  const [openForCommissions, setOpenForCommissions] = useState(false);

  const pickFile = (event) => {
    const next = event.target.files?.[0] || null;
    if (!next) return;
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setEditorOpen(true);
  };

  const applyEdited = (editedFile) => {
    setFile(editedFile);
    setPreviewUrl(URL.createObjectURL(editedFile));
    setEditorOpen(false);
  };

  const toggleTechnique = (tag) => {
    setTechniques((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const goToPublish = () => {
    const tags = Array.from(techniques);
    if (openForCommissions) tags.push(COMMISSION_TAG);
    const content = tags.map((tag) => `#${tag.replace(/\s+/g, '')}#`).join(' ');
    navigate('/publish', {
      state: {
        draft: { file, content, trackId: null, publishType: 'photo' }
      }
    });
  };

  return (
    <Shell>
      <TopBar>
        <IconBtn type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /></IconBtn>
        <Title>Portfolio</Title>
      </TopBar>
      <Body>
        {!file && (
          <FileInput type="file" accept="image/*" onChange={pickFile} />
        )}

        {file && (
          <>
            <Preview>
              <img src={previewUrl} alt="" />
            </Preview>

            <EditBtn type="button" onClick={() => setEditorOpen(true)}>
              <Wand2 size={14} />
              Editar (filtros, ajustes)
            </EditBtn>

            <div>
              <SectionLabel>Técnica (opcional)</SectionLabel>
              <ChipRow>
                {TECHNIQUES.map((tag) => (
                  <Chip
                    key={tag}
                    type="button"
                    $active={techniques.has(tag)}
                    onClick={() => toggleTechnique(tag)}
                  >
                    {tag}
                  </Chip>
                ))}
              </ChipRow>
            </div>

            <div>
              <SectionLabel>Encargos</SectionLabel>
              <ChipRow>
                <Chip
                  type="button"
                  $active={openForCommissions}
                  onClick={() => setOpenForCommissions((prev) => !prev)}
                >
                  Disponible para encargos
                </Chip>
              </ChipRow>
            </div>

            <NextButton type="button" onClick={goToPublish}>
              Siguiente: publicar
              <ArrowRight size={14} />
            </NextButton>
          </>
        )}
      </Body>

      {editorOpen && file && (
        <MediaEditor
          file={file}
          mediaType="photo"
          onApply={applyEdited}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </Shell>
  );
}
