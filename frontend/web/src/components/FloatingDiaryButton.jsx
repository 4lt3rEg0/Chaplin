import React from "react";
import styled from "styled-components";
import { BookOpen } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const IconFloatButton = styled.button`
  position: fixed;
  left: 50%;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-68px);
  z-index: 5002;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary || theme.colors.text};
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  cursor: pointer;
  filter: drop-shadow(0 0 8px rgba(120, 237, 255, 0.45));
  transition: transform 150ms ease, filter 150ms ease;

  &:hover {
    transform: translateX(-68px) scale(1.08);
    filter: drop-shadow(0 0 10px rgba(120, 237, 255, 0.65));
  }
`;

export default function FloatingDiaryButton({ mobilePreviewMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const openDiaryComposer = () => {
    const current = new URLSearchParams(location.search);
    const next = new URLSearchParams();

    ["mobile", "allpages"].forEach((key) => {
      const value = current.get(key);
      if (value != null) {
        next.set(key, value);
      }
    });

    next.set("compose", "1");
    next.set("mode", "diary");
    const query = next.toString();
    navigate(`/feed${query ? `?${query}` : ""}`);
  };

  return (
    <IconFloatButton
      type="button"
      onClick={openDiaryComposer}
      aria-label="Querido diario"
    >
      <BookOpen size={24} />
    </IconFloatButton>
  );
}
