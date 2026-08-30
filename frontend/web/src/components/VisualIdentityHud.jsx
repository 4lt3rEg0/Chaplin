import React from 'react';
import styled from 'styled-components';
import { useSkin } from '../context/SkinContext';

const Frame = styled.div`
  position: fixed;
  inset: calc(112px + var(--chaplin-player-panel-offset, 0px) + var(--safe-top)) 12px calc(96px + var(--safe-bottom));
  z-index: 3;
  pointer-events: none;
  color: ${({ theme }) => theme.colors.primary};
  opacity: ${({ $ornament }) => 0.34 + $ornament * 0.16};

  @media (max-width: 760px) {
    inset: calc(102px + var(--chaplin-player-panel-offset, 0px) + var(--safe-top)) 7px calc(76px + var(--safe-bottom));
    opacity: ${({ $ornament }) => 0.2 + $ornament * 0.1};
  }
`;

const Corner = styled.i`
  position: absolute;
  width: ${({ $hud }) => $hud === 'collector' ? '42px' : $hud === 'scientific' ? '24px' : '34px'};
  height: ${({ $hud }) => $hud === 'collector' ? '28px' : '34px'};
  border-color: currentColor;
  border-style: solid;
  border-width: 0;
  filter: drop-shadow(0 0 5px currentColor);

  ${({ $position }) => $position.includes('t') ? 'top: 0;' : 'bottom: 0;'}
  ${({ $position }) => $position.includes('l') ? 'left: 0;' : 'right: 0;'}
  ${({ $position }) => $position.includes('t') ? 'border-top-width: 1px;' : 'border-bottom-width: 1px;'}
  ${({ $position }) => $position.includes('l') ? 'border-left-width: 1px;' : 'border-right-width: 1px;'}

  ${({ $hud }) => $hud === 'aero' && 'border-radius: 18px;'}
  ${({ $hud }) => $hud === 'tactical' && 'clip-path: polygon(0 0,100% 0,100% 2px,10px 2px,2px 10px,2px 100%,0 100%); background: currentColor;'}
  ${({ $hud }) => $hud === 'industrial' && 'border-width: 3px; border-style: double;'}
  ${({ $hud }) => $hud === 'gothic' && 'transform: rotate(45deg) scale(.7);'}
  ${({ $hud }) => $hud === 'comic' && 'border-width: 3px; filter: none;'}
`;

const Rail = styled.span`
  position: absolute;
  opacity: .58;

  &::before, &::after {
    content: '';
    position: absolute;
    background: currentColor;
  }

  ${({ $side }) => $side === 'left' ? 'left: 0;' : 'right: 0;'}
  top: 18%;
  width: 1px;
  height: 64%;
  background: linear-gradient(transparent, currentColor 16% 84%, transparent);

  &::before { width: 9px; height: 1px; top: 26%; ${({ $side }) => $side === 'left' ? 'left: 0;' : 'right: 0;'} }
  &::after { width: 16px; height: 1px; top: 72%; ${({ $side }) => $side === 'left' ? 'left: 0;' : 'right: 0;'} }

  ${({ $hud }) => ['editorial','scientific'].includes($hud) && 'opacity: .3;'}
  ${({ $hud }) => $hud === 'collector' && 'width: 5px; border-radius: 999px;'}
  ${({ $hud }) => $hud === 'studio' && 'background: repeating-linear-gradient(to bottom,currentColor 0 2px,transparent 2px 12px);'}
`;

const StatusStrip = styled.div`
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  max-width: 62vw;
  font: 600 9px/1 ${({ theme }) => theme.fonts.mono};
  letter-spacing: .13em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span + span::before { content: '·'; margin-right: 12px; opacity: .5; }

  @media (max-width: 760px) { display: none; }
`;

const TickBar = styled.div`
  position: absolute;
  bottom: 3px;
  left: 28%;
  right: 28%;
  height: 3px;
  background: repeating-linear-gradient(90deg,currentColor 0 1px,transparent 1px 14px);
  opacity: ${({ $hud }) => ['studio','industrial','scientific'].includes($hud) ? .7 : .22};
`;

export default function VisualIdentityHud() {
  const { appTheme } = useSkin();
  const hud = appTheme.hud?.id || 'aero';
  const ornament = appTheme.ornament ?? 1;
  if (ornament <= 0) return null;

  return (
    <Frame aria-hidden="true" $ornament={ornament} data-hud={hud}>
      <Corner $position="tl" $hud={hud} /><Corner $position="tr" $hud={hud} />
      <Corner $position="bl" $hud={hud} /><Corner $position="br" $hud={hud} />
      {ornament > 1 ? <><Rail $side="left" $hud={hud} /><Rail $side="right" $hud={hud} /></> : null}
      <StatusStrip>
        <span>{appTheme.meta?.name}</span>
        <span>{appTheme.profile?.layout?.name}</span>
        <span>{appTheme.card?.materialProfile?.name}</span>
      </StatusStrip>
      {ornament > 1 ? <TickBar $hud={hud} /> : null}
    </Frame>
  );
}
