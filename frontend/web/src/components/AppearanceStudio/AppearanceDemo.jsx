import React, { useMemo } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { buildAppTheme } from '../../styles/Y2KTheme';
import BackgroundThumb from './BackgroundThumb';

/*
 * Self-contained live preview sandbox: a miniature, fully composed profile
 * rendered under its OWN local ThemeProvider built straight from the draft
 * appearance state (never the app's real global theme). Nothing here reads
 * or writes SkinContext/VortexContext — it's a pure function of `draft`, so
 * it can sit inside the Settings panel itself and update instantly on every
 * change without ever touching (or being hidden behind) the real app.
 */

const Frame = styled.div`
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-height: 420px;
  isolation: isolate;
`;

const BgLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  > div { width: 100%; height: 100%; }
`;

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: ${({ theme }) => theme.gradients.page};
  opacity: 0.82;
`;

// Composition changes for real depending on the chosen layout — not just a
// recolor. Every LAYOUT_COMPOSITIONS id maps to one of these four arrangements.
const LAYOUT_ARRANGEMENTS = {
  balanced: 'centered', gallery: 'centered', shrine: 'centered',
  edge: 'split', editorial: 'split',
  collector: 'grid', comic: 'grid', terminal: 'grid', arcade: 'grid',
  studio: 'stacked', organic: 'stacked', constellation: 'stacked'
};

const Content = styled.div`
  position: relative;
  z-index: 2;
  padding: 22px 18px;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.secondary};
  display: flex;
  gap: 14px;

  ${({ $arrangement }) => {
    if ($arrangement === 'split') {
      return `
        flex-direction: row;
        align-items: flex-start;
        text-align: left;
        > *:first-child { flex-shrink: 0; }
      `;
    }
    if ($arrangement === 'grid' || $arrangement === 'stacked') {
      return `
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      `;
    }
    return `
      flex-direction: column;
      align-items: center;
      text-align: center;
    `;
  }}
`;

const SplitMain = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.gradients.chrome};
  border: 2px solid ${({ theme }) => theme.colors.primary};
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-align: inherit;
`;

const Handle = styled.div`
  font-size: 12px;
  opacity: 0.75;
  text-align: inherit;
`;

const StatRow = styled.div`
  display: flex;
  gap: 18px;
  font-size: 11px;
  text-align: inherit;
`;

const Stat = styled.div`
  strong { display: block; font-size: 15px; color: ${({ theme }) => theme.colors.primary}; }
`;

const CardRow = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => `repeat(${$cols || 2}, 1fr)`};
  gap: 8px;
  width: 100%;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.card.bg};
  border: 1px solid ${({ theme }) => theme.card.border};
  border-radius: ${({ theme }) => theme.card.radius || '10px'};
  padding: 10px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DemoBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong || theme.colors.border};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 11px;
  font-family: ${({ theme }) => theme.fonts.ui};
`;

export default function AppearanceDemo({ draft }) {
  const draftTheme = useMemo(() => buildAppTheme(
    draft.skinId,
    draft.accentColor,
    draft.animations,
    draft.themeVariant,
    {
      layoutText: draft.textColor,
      fontPrimary: draft.fontPrimary,
      fontSecondary: draft.fontPrimary,
      fontUi: draft.fontPrimary,
      secondaryAccent: draft.secondaryAccent,
      layoutId: draft.layoutId
    }
  ), [draft.skinId, draft.accentColor, draft.animations, draft.themeVariant, draft.textColor, draft.fontPrimary, draft.secondaryAccent, draft.layoutId]);

  const arrangement = LAYOUT_ARRANGEMENTS[draft.layoutId] || 'centered';

  const cards = (
    <CardRow $cols={arrangement === 'stacked' ? 1 : arrangement === 'split' ? 1 : 2}>
      <Card>Publicación de ejemplo con este layout y tipografía.</Card>
      <Card>Otra tarjeta mostrando color de acento y bordes.</Card>
      {arrangement === 'grid' && <Card>Una tercera tarjeta para ver la rejilla.</Card>}
    </CardRow>
  );

  const identity = (
    <div>
      <Name>Tu Perfil</Name>
      <Handle>@tu_usuario</Handle>
    </div>
  );

  const stats = (
    <StatRow>
      <Stat><strong>128</strong>seguidores</Stat>
      <Stat><strong>64</strong>siguiendo</Stat>
      <Stat><strong>12</strong>posts</Stat>
    </StatRow>
  );

  return (
    <ThemeProvider theme={draftTheme}>
      <Frame>
        <BgLayer><BackgroundThumb id={draft.backgroundStyle} autoPlay /></BgLayer>
        <Scrim />
        <Content $arrangement={arrangement}>
          {arrangement === 'split' ? (
            <>
              <SplitMain>
                <Avatar />
                {identity}
                {stats}
              </SplitMain>
              {cards}
            </>
          ) : arrangement === 'stacked' || arrangement === 'grid' ? (
            <>
              <HeaderRow>
                <Avatar />
                <div>
                  {identity}
                  {stats}
                </div>
              </HeaderRow>
              {cards}
            </>
          ) : (
            <>
              <Avatar />
              {identity}
              {stats}
              {cards}
              <DemoBtn type="button">Botón de ejemplo</DemoBtn>
            </>
          )}
        </Content>
      </Frame>
    </ThemeProvider>
  );
}
