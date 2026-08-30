import React, { useState } from "react";
import styled from "styled-components";
import { Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

const Wrap = styled.div`
  position: fixed;
  left: 50%;
  right: auto;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  transform: translateX(30px);
  z-index: 5001;
  transition: transform 180ms ease;
`;

const Button = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary || theme.colors.text};
  border-radius: 0;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  align-items: center;
  cursor: pointer;
  filter: drop-shadow(0 0 8px rgba(120, 237, 255, 0.45));

  &:hover {
    transform: scale(1.08);
    filter: drop-shadow(0 0 10px rgba(120, 237, 255, 0.65));
  }
`;

const Menu = styled.div`
  position: absolute;
  right: -82px;
  bottom: 42px;
  width: 220px;
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
  border-radius: 14px;
  padding: 8px;
  box-shadow: ${({ theme }) => theme.card?.shadow || "0 10px 28px rgba(0,0,0,0.4)"};
  display: grid;
  gap: 6px;
`;

const Item = styled.button`
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  background: ${({ theme }) => theme.colors.accentSoft};
  color: ${({ theme }) => theme.colors.text};
  border-radius: 10px;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
`;

export default function FloatingStationButton({ mobilePreviewMode = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { playFromSource, setActiveSource } = usePlayer();

  const playRadio = async () => {
    setActiveSource("chaplin");
    await playFromSource("chaplin");
    setOpen(false);
  };

  const playPersonal = async () => {
    setActiveSource("personal");
    await playFromSource("personal");
    setOpen(false);
  };

  return (
    <Wrap>
      {open && (
        <Menu>
          <Item type="button" onClick={playRadio}>Reproducir Emisora Chaplin</Item>
          <Item type="button" onClick={playPersonal}>Reproducir Mi Playlist</Item>
          <Item type="button" onClick={() => { navigate("/radio"); setOpen(false); }}>
            Ir a pestaña Radio
          </Item>
        </Menu>
      )}

      <Button type="button" onClick={() => setOpen((prev) => !prev)} aria-label="Emisora">
        <Radio size={16} />
      </Button>
    </Wrap>
  );
}
