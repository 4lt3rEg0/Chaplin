import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { usePlayerOptional } from "../../../context/PlayerContext";
import { useBackgroundRig } from "../shared/useBackgroundRig";

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const HEADER = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uSafeCenter;
uniform float uTime;
uniform float uSub;
uniform float uBass;
uniform float uLowMid;
uniform float uMid;
uniform float uHighMid;
uniform float uTreble;
uniform float uAir;
uniform float uRms;
uniform float uCentroid;
uniform float uFlux;
uniform float uKick;
uniform float uSnare;
uniform float uTransient;
uniform float uPulse;
uniform float uTrackProgress;
uniform float uDeform;

#define PI 3.14159265359
float sat(float x){ return clamp(x, 0.0, 1.0); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise21(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 m=mat2(1.62,1.18,-1.18,1.62);
  for(int i=0;i<4;i++){ v+=noise21(p)*a; p=m*p+0.17; a*=0.5; }
  return v;
}
vec2 screenUv(){
  vec2 p=(gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  p.x*=uResolution.x/max(1.0,uResolution.y);
  vec2 center=(uSafeCenter-0.5)*2.0;
  center.x*=uResolution.x/max(1.0,uResolution.y);
  return p-center*0.34;
}
`;

const SHADERS = {
  grid: `${HEADER}
float fieldHeight(vec2 w){
  float macro=sin(w.x*.58+uTime*.09)*.22+cos(w.y*.42-uTime*.07)*.18;
  float terrain=(fbm(w*.34+vec2(uTime*.018,-uTime*.012))-.5)*.72;
  float ridges=(abs(fbm(w*.78-vec2(uTime*.012,0.0))-.5)-.25)*.38;
  float kickWave=uKick*sin(length(w-vec2(sin(uTime*.3)*2.0,1.5))*5.5-uTime*3.2)*exp(-length(w)*.08)*.22;
  float shear=uSnare*sin(w.x*2.4+w.y*.35-uTime*2.0)*.16;
  return clamp((macro+terrain-ridges+kickWave+shear)*uDeform,-1.15,1.15);
}
void main(){
  vec2 p=screenUv();
  float horizon=.82;
  float depth=1.0/max(.12,p.y+horizon+1.05);
  vec2 world=vec2(p.x*depth*4.8,depth*5.8-uTime*(.08+uBass*.12));
  float h=fieldHeight(world);
  world.y+=h*(1.4+depth*.5);
  vec2 warp=vec2(fbm(world*.18),fbm(world.yx*.21+3.7))-.5;
  world+=warp*(.38+uMid*.42);
  vec2 major=abs(fract(world*.32-.5)-.5)/max(fwidth(world*.32),vec2(.001));
  vec2 minor=abs(fract(world*1.28-.5)-.5)/max(fwidth(world*1.28),vec2(.001));
  float macroLine=1.0-min(min(major.x,major.y),1.0);
  float mesoLine=1.0-min(min(minor.x,minor.y),1.0);
  float contour=pow(.5+.5*cos(h*18.0),22.0);
  float curvature=abs(fieldHeight(world+vec2(.035,0))-fieldHeight(world-vec2(.035,0)))+abs(fieldHeight(world+vec2(0,.035))-fieldHeight(world-vec2(0,.035)));
  float fade=smoothstep(-1.0,.72,p.y)*(1.0-smoothstep(.74,1.0,p.y));
  vec3 abyss=vec3(.004,.009,.018), mineral=vec3(.055,.17,.23), cobalt=vec3(.17,.58,.76), violet=vec3(.34,.2,.54);
  vec3 col=mix(abyss,mineral,sat(h*.5+.52))*fade;
  col+=cobalt*(macroLine*.72+mesoLine*.25+contour*.17)*(fade*(.78+curvature*1.8));
  col+=violet*(smoothstep(.22,.75,curvature)+uSnare*.18)*fade*.32;
  col+=vec3(.72,.86,.92)*uAir*mesoLine*.12*fade;
  col+=vec3(.012,.018,.03)*(1.0-fade);
  gl_FragColor=vec4(col,1.0);
}`,

  neural: `${HEADER}
float cells(vec2 p, out float id){
  vec2 g=floor(p), f=fract(p); float d=9.0; id=0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 o=vec2(float(x),float(y)); float h=hash21(g+o);
    vec2 r=o+0.5+0.32*sin(vec2(h*31.7,h*23.1)+uTime*0.18)-f;
    float nd=dot(r,r); if(nd<d){d=nd;id=h;}
  }
  return sqrt(d);
}
void main(){
  vec2 p=screenUv(); float vign=exp(-dot(p,p)*0.18); p*=2.15;
  p+=vec2(fbm(p*.35+uTime*.025),fbm(p*.31-uTime*.021))*.5;
  float id; float node=cells(p,id); float id2; float near2=cells(p*1.73+3.7,id2);
  float filaments=exp(-28.0*abs(node-near2*.56-.04));
  float hub=exp(-18.0*node*node)*(0.35+0.65*step(.78,id));
  float route=pow(.5+.5*sin(id*90.0+length(p)*5.0-uTime*(1.1+uMid*2.0)),16.0);
  float excitation=(hub*.7+filaments)*(0.36+uLowMid*.5)+route*(uKick*.8+uFlux*.45);
  float inhibition=uSnare*smoothstep(.25,0.0,node)*.55;
  vec3 base=vec3(.006,.012,.024);
  vec3 cold=vec3(.08,.44,.72), signal=vec3(.94,.36,.22), memory=vec3(.36,.18,.62);
  vec3 col=base+memory*filaments*.52+cold*(hub*1.35+filaments*.9)+signal*max(0.0,excitation-inhibition);
  col+=vec3(.72,.88,1.0)*route*(.12+uAir*.5); col*=vign*1.18;
  gl_FragColor=vec4(col,1.0);
}`,

  aurora: `${HEADER}
float curtain(vec2 p,float depth,float seed){
  float flow=fbm(vec2(p.x*.42+seed,uTime*.035+depth));
  float fold=sin(p.x*(1.8+depth*.5)+flow*4.5+seed+uTime*.045);
  float ridge=exp(-pow(abs(p.y-(.22+fold*.24+flow*.18)),1.25)*(7.0+depth*3.0));
  float strands=.62+.38*sin((p.x+flow)*34.0+seed*7.0+uTime*.12);
  return ridge*(.55+strands*.45);
}
void main(){
  vec2 p=screenUv(); p.y+=.08; float horizon=smoothstep(-.82,.2,p.y);
  float c0=curtain(p*vec2(.8,1.0),.2,.7);
  float c1=curtain((p+vec2(.18,-.12))*vec2(.72,1.08),.7,2.4);
  float c2=curtain((p-vec2(.23,.06))*vec2(.64,.94),1.2,4.8);
  float vertical=1.0+uKick*.32*sin((p.y+1.0)*15.0-uTime*2.3);
  float shear=uSnare*.16*sin(p.y*9.0+uTime*1.7);
  c1*=.8+.35*sin((p.x+shear)*7.0+uTime*.16);
  vec3 night=mix(vec3(.004,.012,.027),vec3(.012,.035,.07),horizon);
  vec3 green=vec3(.18,.86,.54), teal=vec3(.08,.48,.68), rose=vec3(.62,.22,.48);
  vec3 col=night+green*c0*vertical*.62+teal*c1*.54+rose*c2*(.24+uCentroid*.36);
  float stars=step(.9975,hash21(floor((p+uTime*.001)*uResolution.xy*.45)))*horizon;
  col+=vec3(.65,.78,.82)*stars*(.15+uAir*.65);
  col*=.72+.28*exp(-dot(p,p)*.16); gl_FragColor=vec4(col,1.0);
}`,

  chrome: `${HEADER}
float surface(vec2 p){
  float tension=.72+uSub*.22;
  float a=sin(p.x*1.7+sin(p.y*1.2)-uTime*.16)*.32;
  float b=sin((p.x+p.y)*2.35+uTime*.11)*.2;
  float basins=fbm(p*1.18+vec2(uTime*.035,-uTime*.022))-.5;
  float ridges=abs(fbm(p*2.8-uTime*.018)-.5)*.28;
  float impulse=uKick*exp(-3.8*abs(length(p-vec2(sin(uTime*.7)*.5,cos(uTime*.53)*.32))-.55));
  return (a+b+basins*.72-ridges+impulse*.22)*tension*uDeform;
}
void main(){
  vec2 p=screenUv()*1.32; p.y+=.12;
  float e=.006; float h=surface(p);
  vec3 n=normalize(vec3(surface(p-vec2(e,0.0))-surface(p+vec2(e,0.0)),surface(p-vec2(0.0,e))-surface(p+vec2(0.0,e)),e*2.0));
  vec3 v=normalize(vec3(-p*.12,1.0)); float fres=pow(1.0-max(dot(n,v),0.0),3.2);
  float bands=.5+.5*sin(n.y*9.0+n.x*5.0+p.y*2.0);
  vec3 warm=vec3(.94,.53,.26), cool=vec3(.11,.35,.62), silver=vec3(.72,.82,.88);
  vec3 env=mix(cool,warm,sat(bands*.75+uCentroid*.45));
  float spec=pow(max(dot(reflect(-normalize(vec3(.4,.7,1.0)),n),v),0.0),36.0-18.0*uLowMid);
  float micro=(fbm(p*18.0+uTime*.04)-.5)*(.08+uTreble*.18);
  vec3 col=mix(silver*.12,env,.42+fres*.58)+spec*vec3(1.0,.92,.78)*(1.0+uAir);
  col+=micro+fres*silver*.25; col*=.82+.18*exp(-dot(p,p)*.1);
  gl_FragColor=vec4(col,1.0);
}`,

  rain: `${HEADER}
float streakLayer(vec2 p,float scale,float depth,float seed){
  vec2 q=p*scale; q.x+=sin(q.y*.34+uTime*.22+seed)*(uMid*.34)+uSnare*.18;
  q.y+=uTime*(1.2+uBass*2.1)*(0.45+depth);
  vec2 cell=floor(q), f=fract(q); float h=hash21(cell+seed);
  float x=.5+(h-.5)*.76; float line=exp(-pow(abs(f.x-x)*mix(45.0,120.0,depth),1.4));
  float tail=smoothstep(.96,.18,f.y)*smoothstep(.0,.12,f.y);
  return line*tail*step(.42,h)*(0.35+depth*.65);
}
void main(){
  vec2 p=screenUv(); float r=0.0;
  r+=streakLayer(p,vec2(7.0,2.7).x,.18,1.0)*.32;
  r+=streakLayer(p+vec2(.13,0),10.0,.5,7.0)*.48;
  r+=streakLayer(p-vec2(.19,0),15.0,.9,19.0)*.78;
  float pressure=.72+uSub*.25; float impact=exp(-45.0*abs(p.y+.78))*pow(.5+.5*sin(p.x*18.0-uTime*3.0),18.0)*uKick;
  vec3 fog=mix(vec3(.004,.008,.014),vec3(.015,.035,.052),sat(p.y+1.0));
  vec3 cyan=vec3(.11,.66,.82), amber=vec3(.9,.47,.16);
  vec3 col=fog+cyan*r*pressure*(1.55+uTreble*.85)+amber*impact*.7;
  col+=vec3(.76,.92,1.0)*step(.998,hash21(gl_FragCoord.xy+floor(uTime*4.0)))*uAir;
  gl_FragColor=vec4(col,1.0);
}`,

  plasma: `${HEADER}
float magnetic(vec2 p){
  float r=length(p), a=atan(p.y,p.x);
  float loops=sin(a*5.0+fbm(vec2(a*2.0,r*3.0-uTime*.12))*4.0+uTime*.18);
  float shell=exp(-18.0*abs(r-(.63+loops*.045*uDeform)));
  float inner=exp(-3.8*r*r)*(fbm(p*3.2+uTime*.04));
  float arcs=pow(max(0.0,sin(a*3.0-r*16.0+uTime*.7)),18.0)*exp(-5.0*abs(r-.75));
  return shell+inner*.7+arcs*(.28+uHighMid*.7);
}
void main(){
  vec2 p=screenUv(); p*=1.05; float r=length(p);
  float field=magnetic(p); float corona=exp(-8.0*max(0.0,r-.64))*(.5+.5*fbm(p*7.0-uTime*.06));
  float eject=uKick*exp(-22.0*abs(r-(.72+uKick*.12)))*(.5+.5*sin(atan(p.y,p.x)*7.0));
  float split=uSnare*pow(.5+.5*sin(atan(p.y,p.x)*11.0+uTime),10.0)*exp(-8.0*abs(r-.68));
  vec3 deep=vec3(.012,.018,.052), violet=vec3(.32,.08,.72), hot=vec3(.2,.68,1.0), white=vec3(.9,.96,1.0);
  vec3 col=deep+violet*field*.52+hot*(field*field*.42+corona*.18)+white*(eject*.55+split*.32+uAir*corona*.08);
  col*=smoothstep(1.32,.44,r); gl_FragColor=vec4(col,1.0);
}`,

  tunnel: `${HEADER}
float frame(vec2 p,float z,float twist){
  float a=atan(p.y,p.x)+twist; float r=length(p);
  float sides=6.0+floor(uMid*3.0); float poly=cos(floor(.5+a/PI*sides)*2.0*PI/sides-a)*r;
  float edge=exp(-70.0*abs(fract(poly*2.2-z)-.5));
  float rails=pow(.5+.5*cos(a*sides),28.0);
  return edge*(.35+rails*.65);
}
void main(){
  vec2 p=screenUv(); p*=1.0+uSub*.08; float colv=0.0; float depth=0.0;
  for(int i=0;i<7;i++){
    float fi=float(i); float z=fract(fi/7.0+uTime*(.035+uBass*.07));
    vec2 q=p/(.16+z*1.18); q*=mat2(cos(z+uTime*.025),-sin(z+uTime*.025),sin(z+uTime*.025),cos(z+uTime*.025));
    float f=frame(q,z*2.0,uSnare*.18*sin(fi)); colv+=f*(1.0-z)*.42; depth+=exp(-12.0*length(q))*.08;
  }
  float compression=1.0+uKick*.45*exp(-3.0*length(p));
  vec3 ink=vec3(.004,.006,.015), edge=vec3(.13,.48,.74), gold=vec3(.86,.43,.16);
  vec3 col=ink+edge*colv*compression*1.45+gold*colv*(.08+uHighMid*.35)+vec3(.55,.72,1.0)*depth*1.25;
  col*=.72+.28*exp(-dot(p,p)*.22); gl_FragColor=vec4(col,1.0);
}`,

  bloom: `${HEADER}
float petal(vec2 p,float count,float phase){
  float a=atan(p.y,p.x), r=length(p); float symmetry=abs(cos(a*count*.5+phase));
  float body=.44+.25*pow(symmetry,1.7)+.07*sin(a*count*2.0+uTime*.12);
  return exp(-34.0*abs(r-body));
}
void main(){
  vec2 p=screenUv(); p*=1.05; float r=length(p), a=atan(p.y,p.x);
  float order=5.0+floor(uMid*3.0); float memory=.35+.65*sat(uTrackProgress*2.0+uRms*.4);
  float p0=petal(p,order,uTime*.025)*memory;
  float p1=petal(p*1.42,order+3.0,-uTime*.035)*.62;
  float branches=pow(.5+.5*cos(a*(order*2.0+3.0)+r*22.0-uTime*.12),18.0)*exp(-2.2*r);
  float growth=exp(-45.0*abs(r-(.2+fract(uTime*.055+uKick*.08)*.72)))*uKick;
  float fracture=uSnare*smoothstep(.08,.0,abs(sin(a*3.0+uTime*.2)))*exp(-1.8*r);
  vec3 dark=vec3(.012,.008,.022), membrane=vec3(.72,.18,.42), glass=vec3(.18,.62,.58), tip=vec3(.95,.76,.4);
  float tissue=(smoothstep(.76,.22,r)-smoothstep(.5,.12,r))*(.5+.5*cos(a*order+uTime*.03));
  vec3 col=dark+membrane*(p0*.72+tissue*.055)+glass*(p1+branches*.34)+tip*(growth*.5+branches*(.04+uAir*.12));
  col=mix(col,col.bgr,fracture*.32); col*=smoothstep(1.25,.72,r)+.08;
  gl_FragColor=vec4(col,1.0);
}`,

  night: `${HEADER}
float terrain(vec2 p){
  float n=fbm(p*.72)+fbm(p*1.83+4.7)*.34;
  float ridge=1.0-abs(noise21(p*1.15)-.5)*2.0;
  return n*.68+ridge*.32;
}
void main(){
  vec2 p=screenUv(); vec2 world=vec2(p.x*1.45,(p.y+1.0)*1.55+uTime*.018);
  float h=terrain(world+vec2(0.0,uSub*.08));
  float horizon=-.42+h*.72; float land=smoothstep(horizon+.025,horizon-.025,p.y);
  float contours=pow(.5+.5*cos(h*52.0),24.0)*land;
  float scanY=fract(uTime*.085+uKick*.12); float scan=exp(-80.0*abs((p.y*.5+.5)-scanY))*land;
  float discontinuity=uSnare*exp(-45.0*abs(p.y-sin(uTime*.3)*.25))*(.5+.5*sin(p.x*40.0));
  float returns=step(.9965,hash21(floor(world*90.0)+floor(uTime*3.0)))*land*uAir;
  vec3 sky=mix(vec3(.002,.008,.007),vec3(.018,.04,.035),sat(p.y+1.0));
  vec3 phosphor=vec3(.22,.72,.46), pale=vec3(.72,.94,.72), thermal=vec3(.76,.47,.22);
  vec3 col=sky+land*phosphor*(.14+h*.32+uBass*.12)+pale*(contours*.22+scan*.62+returns*.5);
  col+=thermal*discontinuity*.28; col*=.76+.24*exp(-dot(p,p)*.18);
  gl_FragColor=vec4(col,1.0);
}`
};

const AUDIO_KEYS = ["sub", "bass", "lowMid", "mid", "highMid", "treble", "air", "rms", "centroid", "flux", "kick", "snare", "highTransient", "pulse", "trackProgress"];
const BASS_KEYS = new Set(["sub", "bass", "kick"]);
const TREBLE_KEYS = new Set(["treble", "air", "highTransient"]);
const TRANSIENT_KEYS = new Set(["kick", "snare", "highTransient"]);

function CinematicField({ shader }) {
  const player = usePlayerOptional();
  const { safeArea, tuning } = useBackgroundRig();
  const materialRef = useRef(null);
  const audioRef = useRef(Object.fromEntries(AUDIO_KEYS.map((key) => [key, key === "centroid" ? 0.28 : 0])));
  const timeRef = useRef(0);
  const uniforms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSafeCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 }, uSub: { value: 0 }, uBass: { value: 0 }, uLowMid: { value: 0 },
    uMid: { value: 0 }, uHighMid: { value: 0 }, uTreble: { value: 0 }, uAir: { value: 0 },
    uRms: { value: 0 }, uCentroid: { value: 0.28 }, uFlux: { value: 0 }, uKick: { value: 0 },
    uSnare: { value: 0 }, uTransient: { value: 0 }, uPulse: { value: 0 }, uTrackProgress: { value: 0 },
    uDeform: { value: 1 }
  }), []);

  useEffect(() => () => materialRef.current?.dispose?.(), []);

  useFrame((state, delta) => {
    const src = player?.visualizerStateRef?.current || {};
    const current = audioRef.current;
    const gain = tuning.reactivity;
    for (const key of AUDIO_KEYS) {
      const fallback = key === "centroid" ? 0.28 : 0;
      let target = THREE.MathUtils.clamp(src[key] ?? fallback, 0, 1);
      if (key !== "trackProgress" && key !== "centroid") target = THREE.MathUtils.clamp(target * gain, 0, 1);
      if (BASS_KEYS.has(key)) target = THREE.MathUtils.clamp(target * tuning.bassBoost, 0, 1);
      if (TREBLE_KEYS.has(key)) target = THREE.MathUtils.clamp(target * tuning.trebleBoost, 0, 1);
      const rate = TRANSIENT_KEYS.has(key) ? (target > current[key] ? 18 : 3.2) : 5.0;
      current[key] += (target - current[key]) * (1 - Math.exp(-rate * Math.min(delta, 0.05)));
    }
    timeRef.current += Math.min(delta, 0.05) * (0.55 + tuning.motionIntensity * 0.45) * (tuning.animationEnabled ? 1 : 0);
    uniforms.uTime.value = timeRef.current;
    uniforms.uResolution.value.set(state.size.width * state.viewport.dpr, state.size.height * state.viewport.dpr);
    uniforms.uSafeCenter.value.set(safeArea.centerX, safeArea.centerY);
    uniforms.uSub.value=current.sub; uniforms.uBass.value=current.bass; uniforms.uLowMid.value=current.lowMid;
    uniforms.uMid.value=current.mid; uniforms.uHighMid.value=current.highMid; uniforms.uTreble.value=current.treble;
    uniforms.uAir.value=current.air; uniforms.uRms.value=current.rms; uniforms.uCentroid.value=current.centroid;
    uniforms.uFlux.value=current.flux; uniforms.uKick.value=current.kick; uniforms.uSnare.value=current.snare;
    uniforms.uTransient.value=current.highTransient; uniforms.uPulse.value=current.pulse;
    uniforms.uTrackProgress.value=current.trackProgress; uniforms.uDeform.value=tuning.deformIntensity;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={VERTEX} fragmentShader={shader} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

export const NeuralWeb = () => <CinematicField shader={SHADERS.neural} />;
export const EnergyGridFloorField = () => <CinematicField shader={SHADERS.grid} />;
export const AuroraSky = () => <CinematicField shader={SHADERS.aurora} />;
export const LiquidChromeWaves = () => <CinematicField shader={SHADERS.chrome} />;
export const RainfieldNeon = () => <CinematicField shader={SHADERS.rain} />;
export const PlasmaSphere = () => <CinematicField shader={SHADERS.plasma} />;
export const DataTunnel = () => <CinematicField shader={SHADERS.tunnel} />;
export const FractalBloom = () => <CinematicField shader={SHADERS.bloom} />;
export const NightVisionLandscape = () => <CinematicField shader={SHADERS.night} />;