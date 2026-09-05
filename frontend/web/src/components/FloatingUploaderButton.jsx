import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Sparkles } from "lucide-react";

const Button = styled.button`
  position: fixed;
  left: 50%;
  right: auto;
  bottom: calc(112px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 1200;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary || theme.colors.text};
  border-radius: 0;
  width: 34px;
  height: 34px;
  padding: 0;
  cursor: pointer;
  filter: drop-shadow(0 0 8px rgba(120, 237, 255, 0.45));
  transition: transform 180ms ease, filter 180ms ease;

  &:hover {
    transform: translateX(-50%) scale(1.08);
    filter: drop-shadow(0 0 10px rgba(120, 237, 255, 0.65));
  }
`;

export default function FloatingUploaderButton({ mobilePreviewMode = false }) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      onClick={() => navigate("/settings")}
      aria-label="Personalizar"
    >
      <Sparkles size={24} />
    </Button>
  );
}
