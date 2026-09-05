import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { Home, Inbox, PlusSquare, Radio, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const Dock = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  border-top: 1px solid ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
  padding: 0 0 env(safe-area-inset-bottom, 0px);
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 -10px 28px rgba(0, 0, 0, 0.35);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  z-index: 85;
`;

const DockButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  min-height: 30px;
  padding: 3px 4px;
  cursor: pointer;
  display: grid;
  gap: 1px;
  place-items: center;
  font-size: 7px;
  letter-spacing: 0.07em;
  text-transform: uppercase;

  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.card?.border || "rgba(255, 255, 255, 0.12)"};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const PublishDockButton = styled(DockButton)`
  color: ${({ theme }) => theme.colors.primary || theme.colors.text};
  background: linear-gradient(0deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
`;

export default function GlobalMobileDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const dockRef = useRef(null);

  // The dock is `position: fixed` at the viewport bottom and reserves no
  // document-flow space, so on a short viewport (e.g. phone landscape) it can
  // sit on top of a page's own bottom controls — found via the Playwright
  // geometry suite covering CANCEL/CREATE_ACCOUNT on /register at 844x390.
  // Same fix shape as FloatingPlayerButton's --chaplin-player-panel-offset:
  // publish the dock's real height so page layouts can reserve space for it.
  useEffect(() => {
    const root = document.documentElement;
    const el = dockRef.current;
    if (!el) {
      root.style.setProperty("--chaplin-mobile-dock-offset", "0px");
      return undefined;
    }

    const updateOffset = () => {
      const rect = el.getBoundingClientRect();
      // rect.height is 0 when the dock is display:none at wider breakpoints.
      root.style.setProperty("--chaplin-mobile-dock-offset", `${rect.height}px`);
    };
    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--chaplin-mobile-dock-offset", "0px");
    };
  }, []);

  const makePathWithFlags = (path, extras = {}) => {
    const current = new URLSearchParams(location.search);
    const next = new URLSearchParams();

    ["mobile", "allpages"].forEach((key) => {
      const value = current.get(key);
      if (value != null) {
        next.set(key, value);
      }
    });

    Object.entries(extras).forEach(([key, value]) => {
      if (value == null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    const query = next.toString();
    return query ? `${path}?${query}` : path;
  };

  return (
    <Dock ref={dockRef}>
      <DockButton type="button" onClick={() => navigate(makePathWithFlags("/feed"))}>
        <Home size={13} />
        feed
      </DockButton>

      <DockButton type="button" onClick={() => navigate(makePathWithFlags("/inbox"))}>
        <Inbox size={13} />
        inbox
      </DockButton>

      <PublishDockButton type="button" onClick={() => navigate(makePathWithFlags("/editor"))}>
        <PlusSquare size={14} />
        publicar
      </PublishDockButton>

      <DockButton type="button" onClick={() => navigate(makePathWithFlags("/radio"))}>
        <Radio size={13} />
        radio
      </DockButton>

      <DockButton type="button" onClick={() => navigate(makePathWithFlags("/profile"))}>
        <User size={13} />
        perfil
      </DockButton>
    </Dock>
  );
}
