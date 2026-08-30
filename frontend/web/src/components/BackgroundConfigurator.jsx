import React from 'react';
import styled from 'styled-components';
import { useVortex, VISUALIZER_VIDEO_OPTIONS } from '../context/VortexContext';
import { useSkin } from '../context/SkinContext';

const ConfigWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ConfigSection = styled.details`
  padding: 16px;
  border-radius: 12px;
  background: ${props => props.$accentColor}08;
  border: 1px solid ${props => props.$accentColor}30;

  &[open] > summary { margin-bottom: 12px; }
`;

const ConfigTitle = styled.h4`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${props => props.$accentColor};
  cursor: pointer;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$textColor}dd;
`;

const Slider = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: ${props => props.$accentColor}30;
  outline: none;
  -webkit-appearance: none;
  appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${props => props.$accentColor};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${props => props.$accentColor};
    cursor: pointer;
    border: none;
  }
`;

const ValueDisplay = styled.span`
  font-size: 11px;
  color: ${props => props.$accentColor};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const ColorInput = styled.input`
  width: 100%;
  height: 36px;
  border: 1px solid ${props => props.$accentColor};
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
`;

const ColorValue = styled.div`
  font-size: 11px;
  color: ${props => props.$accentColor};
  text-align: center;
  font-weight: 600;
`;

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 104px), 1fr));
  gap: 8px;
`;

const OptionButton = styled.button`
  padding: 10px 8px;
  border: 1px solid ${props => props.$active ? props.$accentColor : props.$accentColor + '40'};
  border-radius: 8px;
  background: ${props => props.$active ? props.$accentColor + '20' : 'transparent'};
  color: ${props => props.$accentColor};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  min-width: 0;
  min-height: 44px;
  width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$accentColor}20;
    border-color: ${props => props.$accentColor};
  }
`;

const ChoiceDisclosure = styled.details`
  border: 1px solid ${props => props.$accentColor}30;
  border-radius: 8px;
  margin-top: 8px;
  overflow: hidden;

  summary {
    cursor: pointer;
    padding: 10px 12px;
    color: ${props => props.$accentColor};
    font-size: 11px;
    font-weight: 700;
    line-height: 1.3;
  }

  > div {
    max-height: min(38dvh, 320px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 8px;
    scrollbar-width: thin;
  }
`;

const BACKGROUND_OPTIONS = [
  { id: 'oceanHorizon', label: 'Ocean Horizon' },
  { id: 'liquidTornado', label: 'Liquid Tornado' },
  { id: 'glassHourglass', label: 'Glass Hourglass' },
  { id: 'cosmicTelescope', label: 'Cosmic Telescope' },
  { id: 'energyGridFloor', label: 'Energy Grid Floor' },
  { id: 'neuralWeb', label: 'Neural Web' },
  { id: 'auroraSky', label: 'Aurora Sky' },
  { id: 'liquidChromeWaves', label: 'Liquid Chrome Waves' },
  { id: 'rainfieldNeon', label: 'Rainfield Neon' },
  { id: 'plasmaSphere', label: 'Plasma Sphere' },
  { id: 'dataTunnel', label: 'Fractal Tunnel' },
  { id: 'fractalBloom', label: 'Fractal Bloom' },
  { id: 'nightVisionLandscape', label: 'Night Vision Landscape' },
  ...VISUALIZER_VIDEO_OPTIONS.map(({ id, label }) => ({ id, label })),
  { id: 'vortex', label: 'Vórtice' },
  { id: 'hourglass', label: 'Arena' },
  { id: 'rain', label: 'Lluvia' },
  { id: 'sphere', label: 'Esfera' },
  { id: 'lavaLamp', label: 'Lava' },
  { id: 'aeroHalo', label: 'Halo Aero' },
  { id: 'fluidCurtain', label: 'Cortina Fluida' },
  { id: 'prismBloom', label: 'Prisma Bloom' }
];

const VIDEO_BACKGROUNDS = BACKGROUND_OPTIONS.filter(({ id }) => /^video\d{2}$/.test(id));
const GENERATED_BACKGROUNDS = BACKGROUND_OPTIONS.filter(({ id }) => !/^video\d{2}$/.test(id));

const SliderWithValue = ({ label, min, max, step, value, onChange, accentColor, textColor }) => (
  <ControlGroup>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Label $textColor={textColor}>{label}</Label>
      <ValueDisplay $accentColor={accentColor}>{parseFloat(value).toFixed(2)}</ValueDisplay>
    </div>
    <Slider
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      $accentColor={accentColor}
    />
  </ControlGroup>
);

const BackgroundConfigurator = () => {
  const {
    vortexColor,
    setVortexColor,
    finishType,
    setFinishType,
    backgroundStyle,
    setBackgroundStyle,
    autoSyncEnabled,
    setAutoSyncEnabled,
    animationEnabled,
    setAnimationEnabled,
    visualizerPreset,
    setVisualizerPreset,
    reactivity,
    setReactivity,
    deformIntensity,
    setDeformIntensity,
    motionIntensity,
    setMotionIntensity,
    bassBoost,
    setBassBoost,
    trebleBoost,
    setTrebleBoost
  } = useVortex();

  const { skinData } = useSkin();
  const accentColor = skinData?.accent || '#ff00ff';
  const textColor = '#fff';

  const disableAutoSync = () => {
    if (autoSyncEnabled) {
      setAutoSyncEnabled(false);
    }
  };

  return (
    <ConfigWrapper>
      {/* Color & Finish */}
      <ConfigSection $accentColor={accentColor}>
        <ConfigTitle as="summary" $accentColor={accentColor}>Color & Acabado</ConfigTitle>
        
        <ControlGroup>
          <Label $textColor={textColor}>Color del Vortex</Label>
          <ColorInput
            type="color"
            value={vortexColor}
            onChange={(e) => {
              disableAutoSync();
              setVortexColor(e.target.value);
            }}
            $accentColor={accentColor}
          />
          <ColorValue $accentColor={accentColor}>{vortexColor.toUpperCase()}</ColorValue>
        </ControlGroup>

        <ControlGroup>
          <Label $textColor={textColor}>Tipo de Acabado</Label>
          <OptionGrid>
            {['pearlescent', 'metallic', 'metalized', 'chrome', 'matte', 'glossy'].map((type) => (
              <OptionButton
                key={type}
                $active={finishType === type}
                $accentColor={accentColor}
                onClick={() => {
                  disableAutoSync();
                  setFinishType(type);
                }}
              >
                {type === 'pearlescent' && 'Perlado'}
                {type === 'metallic' && 'Metálico'}
                {type === 'metalized' && 'Metalizado'}
                {type === 'chrome' && 'Cromado'}
                {type === 'matte' && 'Mate'}
                {type === 'glossy' && 'Brillante'}
              </OptionButton>
            ))}
          </OptionGrid>
        </ControlGroup>

        <ControlGroup>
          <Label $textColor={textColor}>Estilo de Fondo</Label>
          <ColorValue $accentColor={accentColor}>
            {BACKGROUND_OPTIONS.find(({ id }) => id === backgroundStyle)?.label || backgroundStyle}
          </ColorValue>
          {[
            { label: 'Fondos generativos', options: GENERATED_BACKGROUNDS },
            { label: 'Visualizadores de vídeo', options: VIDEO_BACKGROUNDS }
          ].map((group) => (
            <ChoiceDisclosure key={group.label} $accentColor={accentColor}>
              <summary>{group.label} · {group.options.length}</summary>
              <OptionGrid>
                {group.options.map(({ id, label }) => (
                  <OptionButton
                    key={id}
                    $active={backgroundStyle === id}
                    $accentColor={accentColor}
                    onClick={() => {
                      disableAutoSync();
                      setBackgroundStyle(id);
                    }}
                  >
                    {label}
                  </OptionButton>
                ))}
              </OptionGrid>
            </ChoiceDisclosure>
          ))}
        </ControlGroup>
      </ConfigSection>

      {/* Reactivity & Motion */}
      <ConfigSection $accentColor={accentColor}>
        <ConfigTitle as="summary" $accentColor={accentColor}>Reactividad</ConfigTitle>

        <SliderWithValue
          label="Reactividad"
          min="0.5"
          max="2"
          step="0.05"
          value={reactivity}
          onChange={(e) => {
            disableAutoSync();
            setReactivity(parseFloat(e.target.value));
          }}
          accentColor={accentColor}
          textColor={textColor}
        />

        <SliderWithValue
          label="Deformación"
          min="0.5"
          max="2"
          step="0.05"
          value={deformIntensity}
          onChange={(e) => {
            disableAutoSync();
            setDeformIntensity(parseFloat(e.target.value));
          }}
          accentColor={accentColor}
          textColor={textColor}
        />

        <SliderWithValue
          label="Movimiento"
          min="0.5"
          max="2"
          step="0.05"
          value={motionIntensity}
          onChange={(e) => {
            disableAutoSync();
            setMotionIntensity(parseFloat(e.target.value));
          }}
          accentColor={accentColor}
          textColor={textColor}
        />
      </ConfigSection>

      {/* Audio */}
      <ConfigSection $accentColor={accentColor}>
        <ConfigTitle as="summary" $accentColor={accentColor}>Respuesta de Audio</ConfigTitle>

        <SliderWithValue
          label="Impulso de Bajos"
          min="0"
          max="2"
          step="0.05"
          value={bassBoost}
          onChange={(e) => {
            disableAutoSync();
            setBassBoost(parseFloat(e.target.value));
          }}
          accentColor={accentColor}
          textColor={textColor}
        />

        <SliderWithValue
          label="Impulso de Agudos"
          min="0"
          max="2"
          step="0.05"
          value={trebleBoost}
          onChange={(e) => {
            disableAutoSync();
            setTrebleBoost(parseFloat(e.target.value));
          }}
          accentColor={accentColor}
          textColor={textColor}
        />
      </ConfigSection>

      {/* Presets */}
      <ConfigSection $accentColor={accentColor}>
        <ConfigTitle as="summary" $accentColor={accentColor}>Presets</ConfigTitle>
        <OptionGrid>
          {['xp_frx', 'win7_aero', 'winamp_milk', 'chaplin_hyper'].map((preset) => (
            <OptionButton
              key={preset}
              $active={visualizerPreset === preset}
              $accentColor={accentColor}
              onClick={() => {
                disableAutoSync();
                setVisualizerPreset(preset);
              }}
            >
              {preset === 'xp_frx' && 'WinXP'}
              {preset === 'win7_aero' && 'Win7'}
              {preset === 'winamp_milk' && 'Winamp'}
              {preset === 'chaplin_hyper' && 'Chaplin'}
            </OptionButton>
          ))}
        </OptionGrid>
      </ConfigSection>

      {/* Toggles */}
      <ConfigSection $accentColor={accentColor}>
        <ConfigTitle as="summary" $accentColor={accentColor}>Estado</ConfigTitle>
        <ControlGroup>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={(e) => setAnimationEnabled(e.target.checked)}
            />
            <span style={{ fontSize: '12px', color: textColor }}>Animación</span>
          </label>
        </ControlGroup>

        <ControlGroup>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
            />
            <span style={{ fontSize: '12px', color: textColor }}>Sincronizar con Tema</span>
          </label>
        </ControlGroup>
      </ConfigSection>
    </ConfigWrapper>
  );
};

export default BackgroundConfigurator;
