import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  life: number;
  maxLife: number;
  hueColor: string;
  tailColor: string;
  isGrand: boolean;
}

interface BurstSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  twinkleOffset: number;
}

interface LightRibbon {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  colorA: string;
  colorB: string;
  thickness: number;
}

const METEOR_PALETTES = [
  { head: '#e0f2fe', tail: 'rgba(56, 189, 248, 0.78)' },
  { head: '#f3e8ff', tail: 'rgba(168, 85, 247, 0.75)' },
  { head: '#cffafe', tail: 'rgba(34, 211, 238, 0.8)' },
  { head: '#fef3c7', tail: 'rgba(251, 146, 60, 0.65)' },
];

const BURST_COLORS = ['#ffffff', '#67e8f9', '#93c5fd', '#c4b5fd', '#fdba74'];

const NEBULA_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const NEBULA_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uScroll;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p = rot * p * 2.04 + vec2(13.1, 7.7);
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 aspectUv = (vUv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 drift = vec2(uTime * 0.014, -uTime * 0.009 + uScroll * 0.25);
    vec2 parallax = (uMouse - 0.5) * 0.06;
    vec2 p = aspectUv * 1.45 + drift + parallax;

    // Domain warping for smooth cosmic nebula waves
    float qx = fbm(p + vec2(uTime * 0.018, -uTime * 0.011));
    float qy = fbm(p + vec2(5.2, 1.3) - vec2(uTime * 0.015, uTime * 0.013));
    vec2 warp = vec2(qx, qy);

    float nebulaA = fbm(p + warp * 1.65);
    float nebulaB = fbm(p * 1.35 - warp * 1.25 + vec2(3.4, 8.1));
    float galaxyBand = exp(-pow((aspectUv.y + aspectUv.x * 0.35 + (qx - 0.5) * 0.45) * 2.1, 2.0));

    // Midnight luxury base
    vec3 col = vec3(0.010, 0.016, 0.042);

    // Purple, electric blue, and violet nebula gradients
    vec3 deepNavy = vec3(0.025, 0.055, 0.16);
    vec3 electricBlue = vec3(0.09, 0.29, 0.72);
    vec3 cosmicPurple = vec3(0.35, 0.11, 0.62);
    vec3 mysticViolet = vec3(0.49, 0.16, 0.78);
    vec3 cyanMist = vec3(0.04, 0.46, 0.64);

    col += deepNavy * smoothstep(0.2, 0.85, nebulaA) * 0.65;
    col += electricBlue * smoothstep(0.42, 0.92, nebulaA) * (0.28 + 0.22 * galaxyBand);
    col += cosmicPurple * smoothstep(0.38, 0.9, nebulaB) * 0.32;
    col += mysticViolet * smoothstep(0.55, 0.96, nebulaA * nebulaB * 2.2) * 0.26;
    col += cyanMist * smoothstep(0.58, 0.95, galaxyBand * nebulaB * 1.8) * 0.18;

    // Organic flowing cosmic dust wave filaments
    float wave1 = sin(aspectUv.x * 3.1 + warp.x * 4.5 + uTime * 0.16) * 0.5 + 0.5;
    float waveMask1 = exp(-abs(aspectUv.y - (wave1 - 0.5) * 0.55 - 0.08) * 7.5);
    col += vec3(0.11, 0.34, 0.78) * waveMask1 * 0.09 * smoothstep(0.3, 0.8, nebulaA);

    float wave2 = cos(aspectUv.x * 2.4 - warp.y * 4.0 - uTime * 0.12) * 0.5 + 0.5;
    float waveMask2 = exp(-abs(aspectUv.y + (wave2 - 0.5) * 0.62 + 0.12) * 8.5);
    col += vec3(0.46, 0.17, 0.76) * waveMask2 * 0.085 * smoothstep(0.35, 0.85, nebulaB);

    // Subtle radial vignette to preserve crisp typography across edges & center
    float vignette = 1.0 - smoothstep(0.38, 1.35, length(aspectUv));
    col *= (0.72 + 0.28 * vignette);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const STAR_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aKind;
  attribute vec3 aColor;
  attribute float aLayer;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uScroll;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vGlitter;
  varying float vKind;
  varying float vAngle;

  void main() {
    vColor = aColor;
    vKind = aKind;

    // Layer-specific autonomous drift speeds for 3D depth parallax
    float layerSpeed = mix(0.18, mix(0.42, 0.88, step(1.5, aLayer)), step(0.5, aLayer));
    vec3 pos = position;

    // Seamless infinite wrapping across depth volume
    float driftX = uTime * 0.45 * layerSpeed;
    float driftY = uTime * 0.22 * layerSpeed + uScroll * 16.0 * layerSpeed;
    pos.x = mod(pos.x + driftX + 120.0, 240.0) - 120.0;
    pos.y = mod(pos.y + driftY + 80.0, 160.0) - 80.0;

    // Gentle pointer parallax
    pos.xy += (uMouse - 0.5) * (3.5 * layerSpeed);

    // Asynchronous multi-harmonic twinkling
    float t1 = sin(uTime * aSpeed + aPhase);
    float t2 = sin(uTime * (aSpeed * 0.57) + aPhase * 1.73);
    float t3 = cos(uTime * (aSpeed * 0.29) + aPhase * 2.41);
    float twinkle = 0.52 + 0.28 * t1 + 0.20 * (t2 * t3);

    // Occasional sharp diamond glitter flash
    float flashSignal = max(0.0, sin(uTime * (aSpeed * 0.42) + aPhase * 3.1));
    float diamondFlash = pow(flashSignal, 16.0);

    // Beacon pulse for larger hero stars
    float beaconPulse = aKind > 1.5 ? (0.85 + 0.55 * pow(0.5 + 0.5 * sin(uTime * 0.85 + aPhase), 3.0)) : 1.0;

    vTwinkle = clamp(twinkle, 0.18, 1.35) * beaconPulse;
    vGlitter = diamondFlash;
    vAngle = aPhase + uTime * 0.08 * (aKind > 0.5 ? 1.0 : 0.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float sizeBoost = 1.0 + diamondFlash * 0.85 + (aKind > 1.5 ? 0.35 * sin(uTime * 0.9 + aPhase) : 0.0);
    float pointSize = aSize * sizeBoost * uPixelRatio * (115.0 / max(-mvPosition.z, 15.0));

    gl_PointSize = clamp(pointSize, 1.1, aKind > 1.5 ? 74.0 : (aKind > 0.5 ? 36.0 : 12.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vGlitter;
  varying float vKind;
  varying float vAngle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Soft glowing core + outer halo
    float core = exp(-d * 13.0);
    float halo = exp(-d * 4.8) * 0.42;
    float intensity = core + halo;

    // Diamond-like 4-point diffraction spikes on glitter & beacon stars
    if (vKind > 0.5) {
      float c = cos(vAngle);
      float s = sin(vAngle);
      vec2 ruv = mat2(c, -s, s, c) * uv;

      float spikeX = exp(-abs(ruv.y) * 46.0) * exp(-abs(ruv.x) * 6.5);
      float spikeY = exp(-abs(ruv.x) * 46.0) * exp(-abs(ruv.y) * 6.5);
      float diamond = (spikeX + spikeY) * (0.55 + vGlitter * 1.45);
      intensity += diamond;
    }

    // Extra diagonal diffraction & subtle optical lens-flare ring on large pulsing beacon stars
    if (vKind > 1.5) {
      float ca = cos(vAngle + 0.785398);
      float sa = sin(vAngle + 0.785398);
      vec2 duv = mat2(ca, -sa, sa, ca) * uv;

      float diag1 = exp(-abs(duv.y) * 58.0) * exp(-abs(duv.x) * 9.5);
      float diag2 = exp(-abs(duv.x) * 58.0) * exp(-abs(duv.y) * 9.5);
      float lensRing = exp(-pow((d - 0.27) * 28.0, 2.0)) * 0.24;
      float anamorphicStreak = exp(-abs(uv.y) * 34.0) * exp(-abs(uv.x) * 3.8) * 0.45;
      intensity += (diag1 + diag2) * 0.75 + lensRing + anamorphicStreak;
    }

    vec3 finalColor = mix(vColor, vec3(1.0), clamp(core * 0.85 + vGlitter * 0.35, 0.0, 1.0));
    float alpha = clamp(intensity * vTwinkle, 0.0, 1.0);

    gl_FragColor = vec4(finalColor * alpha, alpha);
  }
`;

const DUST_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uScroll;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    // Continuous regeneration lifecycle [0..1]
    float life = fract(aPhase + uTime * aSpeed);
    float fadeEnvelope = sin(life * 3.14159265);

    vec3 pos = position;
    // Flowing cosmic dust wave undulation
    pos.x = mod(pos.x + uTime * (1.2 + aSpeed * 8.0) + 110.0, 220.0) - 110.0;
    pos.y += sin(pos.x * 0.045 + uTime * 0.45 + aPhase * 6.28) * 9.5 + uScroll * 11.0;
    pos.z += cos(pos.x * 0.035 + uTime * 0.35 + aPhase * 4.0) * 6.0;
    pos.xy += (uMouse - 0.5) * 4.5;

    float shimmer = 0.55 + 0.45 * sin(uTime * 4.5 + aPhase * 31.4);
    vAlpha = fadeEnvelope * shimmer * 0.82;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(aSize * (0.7 + 0.5 * fadeEnvelope) * uPixelRatio * (110.0 / max(-mvPosition.z, 15.0)), 1.0, 22.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DUST_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float glow = exp(-d * 7.5);
    float crossSpark = (exp(-abs(uv.x) * 28.0) * exp(-abs(uv.y) * 9.0) +
                        exp(-abs(uv.y) * 28.0) * exp(-abs(uv.x) * 9.0)) * 0.35;
    float alpha = clamp((glow + crossSpark) * vAlpha, 0.0, 1.0);

    gl_FragColor = vec4(mix(vColor, vec3(1.0), glow * 0.45) * alpha, alpha);
  }
`;

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const CosmicUniverseBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!container || !overlayCanvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareWebGL();
    const isSmallScreen = window.innerWidth < 768;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    // -----------------------------------------------------------------------
    // 1. THREE.JS WEBGL UNIVERSE (Nebula + 3D Parallax Starfield + Cosmic Dust)
    // -----------------------------------------------------------------------
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      renderer = null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, width / Math.max(height, 1), 0.1, 400);
    camera.position.set(0, 0, 72);

    const nebulaScene = new THREE.Scene();
    const nebulaCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const nebulaUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uScroll: { value: 0 },
    };

    const nebulaGeometry = new THREE.PlaneGeometry(2, 2);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: nebulaUniforms,
      vertexShader: NEBULA_VERTEX_SHADER,
      fragmentShader: NEBULA_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });
    nebulaScene.add(new THREE.Mesh(nebulaGeometry, nebulaMaterial));

    // Build 3-layer 3D starfield
    const starCount = isSmallScreen ? 2400 : 3800;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starPhases = new Float32Array(starCount);
    const starSpeeds = new Float32Array(starCount);
    const starKinds = new Float32Array(starCount);
    const starColors = new Float32Array(starCount * 3);
    const starLayers = new Float32Array(starCount);

    const starPalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#dbeafe'),
      new THREE.Color('#67e8f9'),
      new THREE.Color('#93c5fd'),
      new THREE.Color('#c4b5fd'),
      new THREE.Color('#e9d5ff'),
      new THREE.Color('#fed7aa'),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // 3 depth strata: 0 (deep distant), 1 (mid cosmic), 2 (foreground bright)
      const layerRoll = Math.random();
      const layer = layerRoll < 0.56 ? 0 : layerRoll < 0.88 ? 1 : 2;
      starLayers[i] = layer;

      starPositions[i3] = (Math.random() - 0.5) * 240;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 160;
      starPositions[i3 + 2] =
        layer === 0 ? -90 - Math.random() * 80 : layer === 1 ? -45 - Math.random() * 45 : -5 - Math.random() * 38;

      const specialRoll = Math.random();
      let kind = 0;
      if (layer >= 1 && specialRoll > 0.986) {
        kind = 2; // Large pulsing beacon star with 6-point diffraction & lens flare
      } else if (specialRoll > 0.88) {
        kind = 1; // Diamond glitter flash star
      }
      starKinds[i] = kind;

      starSizes[i] =
        kind === 2
          ? 14 + Math.random() * 10
          : kind === 1
            ? 5.2 + Math.random() * 5.5
            : layer === 0
              ? 1.1 + Math.random() * 1.4
              : 1.8 + Math.random() * 2.5;

      starPhases[i] = Math.random() * Math.PI * 20;
      starSpeeds[i] = 0.7 + Math.random() * 2.6;

      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      starColors[i3] = c.r;
      starColors[i3 + 1] = c.g;
      starColors[i3 + 2] = c.b;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    starGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(starSpeeds, 1));
    starGeometry.setAttribute('aKind', new THREE.BufferAttribute(starKinds, 1));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('aLayer', new THREE.BufferAttribute(starLayers, 1));

    const starUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uScroll: { value: 0 },
    };

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: starUniforms,
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // Build flowing cosmic dust waves & regenerating micro-glitter particles
    const dustCount = isSmallScreen ? 850 : 1400;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    const dustPhases = new Float32Array(dustCount);
    const dustSpeeds = new Float32Array(dustCount);
    const dustColors = new Float32Array(dustCount * 3);

    const dustPalette = [
      new THREE.Color('#38bdf8'),
      new THREE.Color('#818cf8'),
      new THREE.Color('#a855f7'),
      new THREE.Color('#22d3ee'),
      new THREE.Color('#f472b6'),
      new THREE.Color('#fdba74'),
    ];

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const ribbonBand = i % 3;
      const bandCenterY = ribbonBand === 0 ? -18 : ribbonBand === 1 ? 6 : 24;

      dustPositions[i3] = (Math.random() - 0.5) * 220;
      dustPositions[i3 + 1] = bandCenterY + (Math.random() - 0.5) * 26;
      dustPositions[i3 + 2] = -20 - Math.random() * 65;

      dustSizes[i] = 2.0 + Math.random() * 3.8;
      dustPhases[i] = Math.random();
      dustSpeeds[i] = 0.04 + Math.random() * 0.09;

      const c = dustPalette[Math.floor(Math.random() * dustPalette.length)];
      dustColors[i3] = c.r;
      dustColors[i3 + 1] = c.g;
      dustColors[i3 + 2] = c.b;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));
    dustGeometry.setAttribute('aPhase', new THREE.BufferAttribute(dustPhases, 1));
    dustGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(dustSpeeds, 1));
    dustGeometry.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));

    const dustUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uScroll: { value: 0 },
    };

    const dustMaterial = new THREE.ShaderMaterial({
      uniforms: dustUniforms,
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    if (renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      renderer.autoClear = false;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.pointerEvents = 'none';
      container.insertBefore(renderer.domElement, overlayCanvas);
    }

    // -----------------------------------------------------------------------
    // 2. 2D ADDITIVE OVERLAY (Shooting Stars, Meteors, Shimmer Bursts, Light Trails)
    // -----------------------------------------------------------------------
    const ctx2d = overlayCanvas.getContext('2d');
    const resizeOverlay = () => {
      overlayCanvas.width = Math.floor(width * dpr);
      overlayCanvas.height = Math.floor(height * dpr);
      if (ctx2d) {
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resizeOverlay();

    const meteors: Meteor[] = [];
    const burstSparks: BurstSpark[] = [];
    const ribbons: LightRibbon[] = [
      {
        baseY: 0.28,
        amplitude: 48,
        frequency: 0.0024,
        speed: 0.32,
        phase: 0.4,
        colorA: 'rgba(56, 189, 248, 0.08)',
        colorB: 'rgba(139, 92, 246, 0.09)',
        thickness: 2.2,
      },
      {
        baseY: 0.62,
        amplitude: 62,
        frequency: 0.0018,
        speed: -0.24,
        phase: 2.1,
        colorA: 'rgba(168, 85, 247, 0.08)',
        colorB: 'rgba(37, 99, 235, 0.07)',
        thickness: 1.8,
      },
      {
        baseY: 0.82,
        amplitude: 36,
        frequency: 0.0031,
        speed: 0.21,
        phase: 4.3,
        colorA: 'rgba(34, 211, 238, 0.06)',
        colorB: 'rgba(249, 115, 22, 0.05)',
        thickness: 1.5,
      },
    ];

    const spawnMeteor = (forceGrand = false) => {
      const isGrand = forceGrand || Math.random() > 0.78;
      const fromRight = Math.random() > 0.35;
      const startX = fromRight
        ? width * (0.25 + Math.random() * 0.85)
        : width * (Math.random() * 0.65);
      const startY = -20 + Math.random() * (height * 0.48);
      const speed = isGrand ? 760 + Math.random() * 340 : 480 + Math.random() * 300;
      const angle = fromRight
        ? Math.PI * (0.68 + Math.random() * 0.16)
        : Math.PI * (0.16 + Math.random() * 0.16);

      const palette = METEOR_PALETTES[Math.floor(Math.random() * METEOR_PALETTES.length)];
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: isGrand ? 190 + Math.random() * 120 : 95 + Math.random() * 80,
        width: isGrand ? 2.6 : 1.5,
        life: 0,
        maxLife: isGrand ? 1.45 + Math.random() * 0.5 : 0.85 + Math.random() * 0.55,
        hueColor: palette.head,
        tailColor: palette.tail,
        isGrand,
      });
    };

    const spawnBurst = (cx?: number, cy?: number) => {
      const originX = cx ?? width * (0.12 + Math.random() * 0.76);
      const originY = cy ?? height * (0.12 + Math.random() * 0.72);
      const count = isSmallScreen ? 16 : 26;
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const speed = 18 + Math.random() * 68;
        burstSparks.push({
          x: originX,
          y: originY,
          vx: Math.cos(theta) * speed,
          vy: Math.sin(theta) * speed,
          size: 0.9 + Math.random() * 2.1,
          life: 0,
          maxLife: 1.4 + Math.random() * 1.4,
          color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    // Seed initial live atmosphere immediately
    if (!prefersReducedMotion) {
      spawnMeteor(true);
      spawnBurst(width * 0.72, height * 0.28);
    }

    // Smooth pointer & scroll tracking
    const targetMouse = { x: 0.5, y: 0.5 };
    const currentMouse = { x: 0.5, y: 0.5 };
    let targetScroll = 0;
    let currentScroll = 0;

    const handlePointerMove = (e: PointerEvent) => {
      targetMouse.x = e.clientX / Math.max(width, 1);
      targetMouse.y = 1.0 - e.clientY / Math.max(height, 1);
    };

    const handleScroll = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      targetScroll = window.scrollY / maxScroll;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();

      if (renderer) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height);
      }
      nebulaUniforms.uResolution.value.set(width * dpr, height * dpr);
      starUniforms.uPixelRatio.value = dpr;
      dustUniforms.uPixelRatio.value = dpr;
      resizeOverlay();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleScroll();

    // Animation loop with software-WebGL pacing guard
    let frameId = 0;
    let isDisposed = false;
    let lastTimestamp = performance.now();
    let elapsed = 0;
    let meteorCooldown = 1.1;
    let burstCooldown = 3.2;

    const drawOverlayEffects = (dt: number, t: number) => {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.globalCompositeOperation = 'lighter';

      // Organic flowing cosmic light trails
      for (let r = 0; r < ribbons.length; r++) {
        const rb = ribbons[r];
        const grad = ctx2d.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.28, rb.colorA);
        grad.addColorStop(0.65, rb.colorB);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx2d.beginPath();
        const stepX = isSmallScreen ? 48 : 34;
        for (let x = 0; x <= width + stepX; x += stepX) {
          const y =
            height * rb.baseY +
            Math.sin(x * rb.frequency + t * rb.speed + rb.phase) * rb.amplitude +
            Math.cos(x * rb.frequency * 1.9 - t * rb.speed * 0.7) * (rb.amplitude * 0.38);
          if (x === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.strokeStyle = grad;
        ctx2d.lineWidth = rb.thickness;
        ctx2d.stroke();
      }

      if (prefersReducedMotion) {
        ctx2d.globalCompositeOperation = 'source-over';
        return;
      }

      // Autonomous meteor & shooting star spawner
      meteorCooldown -= dt;
      if (meteorCooldown <= 0) {
        spawnMeteor(false);
        meteorCooldown = 1.4 + Math.random() * 2.6;
      }

      // Occasional shimmering stardust bursts
      burstCooldown -= dt;
      if (burstCooldown <= 0) {
        spawnBurst();
        burstCooldown = 4.2 + Math.random() * 4.5;
      }

      // Render & advance meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        if (m.life >= m.maxLife) {
          meteors.splice(i, 1);
          continue;
        }

        m.x += m.vx * dt;
        m.y += m.vy * dt;

        const progress = m.life / m.maxLife;
        const fade = Math.sin(progress * Math.PI);
        const speedNorm = Math.hypot(m.vx, m.vy) || 1;
        const ux = m.vx / speedNorm;
        const uy = m.vy / speedNorm;
        const tailX = m.x - ux * m.length * (0.4 + 0.6 * fade);
        const tailY = m.y - uy * m.length * (0.4 + 0.6 * fade);

        // Tapered plasma trail
        const trailGrad = ctx2d.createLinearGradient(tailX, tailY, m.x, m.y);
        trailGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        trailGrad.addColorStop(0.55, m.tailColor);
        trailGrad.addColorStop(1, m.hueColor);

        ctx2d.save();
        ctx2d.globalAlpha = fade;
        ctx2d.beginPath();
        ctx2d.moveTo(tailX, tailY);
        ctx2d.lineTo(m.x, m.y);
        ctx2d.strokeStyle = trailGrad;
        ctx2d.lineWidth = m.width;
        ctx2d.lineCap = 'round';
        ctx2d.stroke();

        // Luminous star head flare
        const headRadius = m.isGrand ? 11 : 6.5;
        const headGlow = ctx2d.createRadialGradient(m.x, m.y, 0, m.x, m.y, headRadius);
        headGlow.addColorStop(0, '#ffffff');
        headGlow.addColorStop(0.35, m.hueColor);
        headGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2d.fillStyle = headGlow;
        ctx2d.beginPath();
        ctx2d.arc(m.x, m.y, headRadius, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();

        // Occasional trailing stardust sparks off grand meteors
        if (m.isGrand && Math.random() > 0.45 && burstSparks.length < 180) {
          burstSparks.push({
            x: m.x - ux * 6,
            y: m.y - uy * 6,
            vx: (Math.random() - 0.5) * 28 - ux * 20,
            vy: (Math.random() - 0.5) * 28 - uy * 20,
            size: 0.8 + Math.random() * 1.3,
            life: 0,
            maxLife: 0.45 + Math.random() * 0.4,
            color: m.hueColor,
            twinkleOffset: Math.random() * 6.28,
          });
        }
      }

      // Render & advance shimmering burst sparkles
      for (let i = burstSparks.length - 1; i >= 0; i--) {
        const sp = burstSparks[i];
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          burstSparks.splice(i, 1);
          continue;
        }
        sp.vx *= 0.985;
        sp.vy *= 0.985;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;

        const progress = sp.life / sp.maxLife;
        const alpha =
          (1 - progress) *
          Math.min(1, progress * 5) *
          (0.5 + 0.5 * Math.sin(t * 14 + sp.twinkleOffset));

        ctx2d.save();
        ctx2d.globalAlpha = alpha;
        ctx2d.fillStyle = sp.color;
        ctx2d.beginPath();
        ctx2d.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx2d.fill();

        // Tiny diamond cross glint on bright sparks
        if (sp.size > 1.7) {
          const arm = sp.size * 3.1;
          ctx2d.strokeStyle = sp.color;
          ctx2d.lineWidth = 0.7;
          ctx2d.beginPath();
          ctx2d.moveTo(sp.x - arm, sp.y);
          ctx2d.lineTo(sp.x + arm, sp.y);
          ctx2d.moveTo(sp.x, sp.y - arm);
          ctx2d.lineTo(sp.x, sp.y + arm);
          ctx2d.stroke();
        }
        ctx2d.restore();
      }

      ctx2d.globalCompositeOperation = 'source-over';
    };

    const afterDraw = (cb: () => void) => {
      if (!renderer) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const renderFrame = (now: number) => {
      if (isDisposed) return;

      const rawDt = Math.min((now - lastTimestamp) / 1000, 0.08);
      lastTimestamp = now;
      const dt = prefersReducedMotion ? 0 : rawDt;
      elapsed += dt;

      // Smooth pointer & scroll interpolation
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.05;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.05;
      currentScroll += (targetScroll - currentScroll) * 0.08;

      nebulaUniforms.uTime.value = elapsed;
      nebulaUniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
      nebulaUniforms.uScroll.value = currentScroll;

      starUniforms.uTime.value = elapsed;
      starUniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
      starUniforms.uScroll.value = currentScroll;

      dustUniforms.uTime.value = elapsed;
      dustUniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
      dustUniforms.uScroll.value = currentScroll;

      // Subtle slow 3D orbital tilt of star camera for depth
      camera.position.x = (currentMouse.x - 0.5) * 3.2;
      camera.position.y = (currentMouse.y - 0.5) * 2.2;
      camera.lookAt(0, 0, -40);

      if (renderer) {
        renderer.clear();
        renderer.render(nebulaScene, nebulaCamera);
        renderer.render(scene, camera);
      }

      drawOverlayEffects(dt, elapsed);

      if (!prefersReducedMotion) {
        if (isSoftwareGl) {
          afterDraw(() => renderFrame(performance.now()));
        } else {
          frameId = requestAnimationFrame(renderFrame);
        }
      }
    };

    // Initial render
    renderFrame(performance.now());

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      nebulaGeometry.dispose();
      nebulaMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none bg-[#03050d] overflow-hidden"
      aria-hidden="true"
    >
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
