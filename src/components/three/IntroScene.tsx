"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

/* ================================================================
   CINEMATIC TIMELINE — "The Signal in the Noise"  (~16.2s)

   0.0 – 4.4   ACT I  · NOISE      — camera drifts through chaos
   4.4 – 5.6   ACT II · SPARK     — ignition + shockwave blast
   7.6 – 11.4  ACT III· SKYLINE   — candles assemble, crane shot up
   11.4 – 14.2 ACT IV · SENSE     — candles merge into the orb
   14.2 – 16.2 ACT V  · DIVE      — camera dives into the light
   ================================================================ */

const D = {
  spark: 4.4,
  blast: 5.6,
  assemble: 7.6,
  craneEnd: 11.4,
  merge: 12.4,
  dive: 14.2,
  end: 16.2,
};

/* ---------- easing helpers ---------- */
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const smooth = (p: number) => p * p * (3 - 2 * p);
const outCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const inCubic = (p: number) => p * p * p;
const outExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const inExpo = (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
const outBack = (p: number) => {
  const c = 1.70158 * 1.2;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const outElastic = (p: number) => {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const c = (2 * Math.PI) / 0.9;
  return Math.pow(2, -9 * p) * Math.sin((p * 9 - 0.75) * c) + 1;
};

type KF = [number, number, ((p: number) => number)?];
/** piecewise keyframe track with per-segment easing */
function track(t: number, keys: KF[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1, ease] = keys[i + 1];
    if (t <= t1) {
      const p = clamp01((t - t0) / Math.max(t1 - t0, 1e-5));
      return v0 + (v1 - v0) * (ease ? ease(p) : smooth(p));
    }
  }
  return keys[keys.length - 1][1];
}

/* ---------- palettes ---------- */
function palette(mode: "light" | "dark") {
  return mode === "light"
    ? {
        fog: "#efe3da",
        particles: ["#ffc46b", "#ff9ec4", "#7cc9ff", "#7fe3b1", "#ffd884"],
        up: "#35d492",
        down: "#ff7d99",
        candleDim: 0.9,
        ambient: 0.9,
      }
    : {
        fog: "#0a0d15",
        particles: ["#ffd27a", "#ff9ec4", "#8fd2ff", "#8fe8c0", "#ffe0a0"],
        up: "#2fe8a2",
        down: "#ff7590",
        candleDim: 1.15,
        ambient: 0.35,
      };
}

/* ================================================================
   CAMERA RIG — keyframed cinematic path + handheld micro-sway
   ================================================================ */
function Rig({ mode }: { mode: "light" | "dark" }) {
  const look = React.useRef(new THREE.Vector3(0, 0.6, 0));

  useFrame((state) => {
    const camera = state.camera;
    const t = state.clock.getElapsedTime();

    /* --- keyframed tracks --- */
    const px = track(t, [
      [0, 0],
      [4.2, 0.4, smooth],
      [5.2, -0.5, smooth],
      [7.6, 0.8, smooth],
      [9.4, 2.6, smooth],
      [11.4, 0.2, smooth],
      [D.dive, 0, smooth],
      [D.end, 0],
    ]);
    const py = track(t, [
      [0, 1.4],
      [4.4, 1.1, smooth],
      [5.6, 1.0, outCubic],
      [7.6, 0.9, smooth],
      [D.craneEnd, 7.6, outCubic],
      [12.8, 3.1, inOut()],
      [D.dive, 2.4, smooth],
      [D.end, 0.6, smooth],
    ]);
    const pz = track(t, [
      [0, 17],
      [4.2, 11.6, smooth],
      [4.55, 12.4, smooth], // anticipation pull-back
      [5.35, 8.6, outCubic], // whip in on ignition
      [5.75, 9.9, outCubic], // blast push-back
      [7.6, 9.2, smooth],
      [D.craneEnd, 7.2, smooth],
      [13.2, 10.8, inOut()],
      [D.dive, 10.8],
      [D.end, 0.9, inExpo], // THE DIVE
    ]);
    const fov = track(t, [
      [0, 58],
      [4.4, 54, smooth],
      [5.35, 62, outCubic],
      [7.6, 52, smooth],
      [D.dive, 55, smooth],
      [D.end, 96, inCubic],
    ]);
    const roll = track(t, [
      [0, 0.03],
      [4.4, -0.04, smooth],
      [7.6, 0.05, smooth],
      [D.craneEnd, -0.03, smooth],
      [13, 0, smooth],
      [D.end, 0],
    ]);

    /* handheld micro-sway (amplifies during dive) */
    const swayAmp = t > D.dive ? 0.05 : 0.09;
    const sx = Math.sin(t * 0.9) * swayAmp + Math.sin(t * 2.3) * swayAmp * 0.4;
    const sy = Math.cos(t * 0.7) * swayAmp * 0.8;

    camera.position.set(px + sx, py + sy, pz);
    camera.rotation.z = roll + Math.sin(t * 0.5) * 0.006;

    const ly = track(t, [
      [0, 0.6],
      [7.6, 1.2, smooth],
      [D.craneEnd, 6.4, outCubic],
      [13.2, 2.2, inOut()],
      [D.end, 1.6, smooth],
    ]);
    look.current.set(sx * 0.3, ly + sy * 0.3, 0);
    camera.lookAt(look.current);

    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fov;
    cam.updateProjectionMatrix();
  });
  return null;
}
function inOut() {
  return (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
}

/* ================================================================
   NOISE CLOUD — chaos particles: drift → blast → vortex → shell
   ================================================================ */
function NoiseCloud({ mode, isMobile }: { mode: "light" | "dark"; isMobile: boolean }) {
  const COUNT = isMobile ? 420 : 950;
  const pointsRef = React.useRef<THREE.Points>(null);
  const matRef = React.useRef<THREE.PointsMaterial>(null);
  const pal = React.useMemo(() => palette(mode), [mode]);
  const isDark = mode === "dark";

  const data = React.useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT * 4); // phase, speed, radius, delay
    const blastDir = new Float32Array(COUNT * 3);
    const vortex = new Float32Array(COUNT * 3);
    const shell = new Float32Array(COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const r = 5 + Math.random() * 12;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(ph) * Math.cos(th);
      const y = (Math.random() - 0.35) * 14;
      const z = r * Math.sin(ph) * Math.sin(th) * 0.7;
      pos.set([x, y, z], i * 3);
      c.set(pal.particles[i % pal.particles.length]);
      c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      col.set([c.r, c.g, c.b], i * 3);
      seed.set(
        [Math.random() * Math.PI * 2, 0.4 + Math.random() * 0.8, r, Math.random() * 1.4],
        i * 4
      );
      const d = new THREE.Vector3(x, y - 1, z).normalize();
      blastDir.set([d.x, d.y, d.z], i * 3);
      // spiral vortex target
      const a = Math.random() * Math.PI * 2 + r * 0.55;
      const vr = 2 + Math.random() * 5;
      vortex.set([Math.cos(a) * vr, -4 + Math.random() * 11, Math.sin(a) * vr * 0.6], i * 3);
      // sphere shell target (around orb)
      const s = new THREE.Vector3().randomDirection().multiplyScalar(3.1 + Math.random() * 0.5);
      shell.set([s.x, s.y, s.z], i * 3);
    }
    return { pos, col, seed, blastDir, vortex, shell };
  }, [COUNT, pal.particles]);

  React.useEffect(() => {
    const geo = pointsRef.current?.geometry;
    if (!geo) return;
    geo.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(data.col, 3));
  }, [data]);

  const tmp = React.useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const geo = pointsRef.current?.geometry;
    const posAttr = geo?.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const [ph, sp, r0, delay] = [data.seed[i * 4], data.seed[i * 4 + 1], data.seed[i * 4 + 2], data.seed[i * 4 + 3]];

      /* base drift */
      const bx = Math.sin(ph + t * sp) * 0.5;
      const by = Math.cos(ph * 1.3 + t * sp * 0.8) * 0.5;
      const bz = Math.sin(ph * 0.7 + t * sp * 1.2) * 0.5;
      let px = data.pos[i3] + bx;
      let py = data.pos[i3 + 1] + by * 1.4;
      let pz = data.pos[i3 + 2] + bz;

      /* ACT II — shockwave pushes outward */
      if (t > D.blast) {
        const wave = (t - D.blast) * 16;
        const dist = Math.sqrt(
          (data.pos[i3]) ** 2 + (data.pos[i3 + 1] - 1) ** 2 + (data.pos[i3 + 2]) ** 2
        );
        if (dist < wave) {
          const f = outCubic(clamp01(1 - (wave - dist) / 9)) * 6;
          px += data.blastDir[i3] * f;
          py += data.blastDir[i3 + 1] * f;
          pz += data.blastDir[i3 + 2] * f;
        }
      }

      /* ACT III — swirl into vortex */
      if (t > 8.2) {
        const vp = clamp01((t - 8.2 - delay) / 2.6);
        const e = smooth(vp);
        const spin = t * 1.2 + ph;
        px += (Math.cos(spin) * (r0 * 0.3) + data.vortex[i3] - px) * e;
        py += (data.vortex[i3 + 1] - py) * e;
        pz += (Math.sin(spin) * (r0 * 0.2) + data.vortex[i3 + 2] - pz) * e;
      }

      /* ACT IV — converge to orb shell */
      if (t > D.merge) {
        const mp = outCubic(clamp01((t - D.merge - delay * 0.4) / 2.2));
        const breathe = 1 + Math.sin(t * 2 + ph) * 0.04;
        px += (data.shell[i3] * breathe - px) * mp;
        py += (data.shell[i3 + 1] * breathe - py) * mp;
        pz += (data.shell[i3 + 2] * breathe - pz) * mp;
      }

      arr[i3] = px;
      arr[i3 + 1] = py;
      arr[i3 + 2] = pz;
    }
    posAttr.needsUpdate = true;

    /* fade out during dive */
    if (matRef.current) {
      const fade = 1 - clamp01((t - (D.dive + 0.6)) / 1.1);
      matRef.current.opacity = (isDark ? 0.85 : 0.95) * fade;
      matRef.current.size = (isDark ? 0.075 : 0.11) + Math.sin(t * 1.4) * 0.008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        ref={matRef}
        size={isDark ? 0.075 : 0.11}
        sizeAttenuation
        vertexColors
        transparent
        opacity={isDark ? 0.85 : 0.95}
        depthWrite={false}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
        fog={false}
      />
    </points>
  );
}
/* ================================================================
   CANDLE SKYLINE — 48 instanced candles: ghost chaos → skyline → orb
   ================================================================ */
type CandleDatum = {
  scatter: THREE.Vector3;
  skyline: THREE.Vector3; // final base position
  sphere: THREE.Vector3;
  h: number;
  up: boolean;
  delay: number;
  spin: number;
};
function CandleSkyline({ mode, isMobile }: { mode: "light" | "dark"; isMobile: boolean }) {
  const COUNT = isMobile ? 30 : 48;
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const matRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const pal = React.useMemo(() => palette(mode), [mode]);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);

  const candles = React.useMemo<CandleDatum[]>(() => {
    const arr: CandleDatum[] = [];
    for (let i = 0; i < COUNT; i++) {
      const scatter = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(5 + Math.random() * 7);
      scatter.y = (Math.random() - 0.4) * 9;
      const x = -8.5 + (i / COUNT) * 17 + (Math.random() - 0.5) * 0.7;
      const z = -1.6 + Math.sin(i * 0.8) * 1.6 + (Math.random() - 0.5) * 0.9;
      const h = 0.7 + Math.abs(Math.sin(i * 1.7)) * 2.4;
      const up = i % 3 !== 2;
      const sphere = new THREE.Vector3().randomDirection().multiplyScalar(2.5);
      arr.push({ scatter, skyline: new THREE.Vector3(x, 0, z), sphere, h, up, delay: i * 0.09, spin: Math.random() * Math.PI * 2 });
    }
    return arr;
  }, [COUNT]);

  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      c.set(candles[i].up ? pal.up : pal.down);
      c.multiplyScalar(pal.candleDim * (0.82 + Math.random() * 0.25));
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [candles, COUNT, pal]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < COUNT; i++) {
      const cd = candles[i];
      let x: number, y: number, z: number, sy: number, rot: number;

      /* ACT I — ghost chaos drift */
      const gx = cd.scatter.x + Math.sin(t * 0.5 + cd.spin) * 0.6;
      const gy = cd.scatter.y + Math.cos(t * 0.4 + cd.spin * 1.3) * 0.8;
      const gz = cd.scatter.z;

      /* ACT III — fly to skyline (staggered) */
      const fp = clamp01((t - D.assemble - cd.delay) / 1.5);
      const fe = outBack(fp);
      x = gx + (cd.skyline.x - gx) * fe;
      z = gz + (cd.skyline.z - gz) * fe;
      const baseY = cd.skyline.y;
      const grow = outElastic(clamp01((t - D.assemble - cd.delay - 0.25) / 1.4));
      sy = 0.06 + cd.h * grow;
      y = gy + (baseY + sy / 2 - gy) * fe;

      rot = Math.sin(t * 0.6 + cd.spin) * 0.3 * (1 - fp);

      /* ACT IV — merge into orb */
      if (t > D.merge) {
        const mp = smooth(clamp01((t - D.merge - cd.delay * 0.35) / 2));
        const orbSpin = t * 0.5 + cd.spin;
        const tx = cd.sphere.x * Math.cos(orbSpin) - cd.sphere.z * Math.sin(orbSpin);
        const tz = -cd.sphere.x * Math.sin(orbSpin) + cd.sphere.z * Math.cos(orbSpin);
        x += (tx - x) * mp;
        y += (cd.sphere.y + 1.6 - y) * mp;
        z += (tz - z) * mp;
        sy = sy * (1 - mp) + 0.34 * mp;
        rot *= 1 - mp;
      }

      dummy.position.set(x, y, z);
      dummy.rotation.set(rot * 0.4, rot, rot * 0.2);
      const w = cd.up ? 0.34 : 0.3;
      dummy.scale.set(w, sy, w);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (matRef.current) {
      const fade = 1 - clamp01((t - (D.dive + 0.5)) / 1);
      matRef.current.opacity = 0.95 * fade;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial ref={matRef} transparent opacity={0.95} toneMapped={false} fog />
    </instancedMesh>
  );
}

/* ================================================================
   SPARK ORB — ignition core + glow shells + shockwave rings
   ================================================================ */
function SparkOrb({ mode }: { mode: "light" | "dark" }) {
  const coreRef = React.useRef<THREE.Mesh>(null);
  const glow1 = React.useRef<THREE.Mesh>(null);
  const glow2 = React.useRef<THREE.Mesh>(null);
  const lightRef = React.useRef<THREE.PointLight>(null);
  const rings = React.useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const pal = React.useMemo(() => palette(mode), [mode]);
  const warm = mode === "light" ? "#ffdf9e" : "#ffe9c2";

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const ignite = outElastic(clamp01((t - D.spark) / 0.9));

    const pulse = 1 + Math.sin(t * 3.1) * 0.06 + Math.sin(t * 7.3) * 0.02;
    const mergeGrow = 1 + smooth(clamp01((t - D.merge) / 2.4)) * 1.6;
    const diveGrow = 1 + inCubic(clamp01((t - D.dive) / 1.9)) * 26;

    const s = ignite * pulse * mergeGrow * diveGrow;
    if (coreRef.current) {
      coreRef.current.scale.setScalar(Math.max(s, 0.0001));
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = ignite;
    }
    if (glow1.current) glow1.current.scale.setScalar(Math.max(s * 1.7, 0.0001));
    if (glow2.current) glow2.current.scale.setScalar(Math.max(s * 2.7, 0.0001));
    if (lightRef.current) {
      lightRef.current.intensity =
        ignite * (5.5 + Math.sin(t * 3) * 0.8 + smooth(clamp01((t - D.merge) / 2)) * 4);
    }

    /* shockwave rings at blast moment */
    rings.current.forEach((m, idx) => {
      if (!m) return;
      const start = D.blast + idx * 0.22;
      const p = clamp01((t - start) / 1.25);
      const sc = 0.2 + outCubic(p) * (15 + idx * 5);
      m.scale.setScalar(sc);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p) * 0.55;
    });
  });

  return (
    <group position={[0, 1.6, 0]}>
      <pointLight ref={lightRef} color={warm} intensity={0} distance={40} decay={1.6} />
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshBasicMaterial color={warm} toneMapped={false} transparent opacity={0} />
      </mesh>
      <mesh ref={glow1}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshBasicMaterial color={pal.particles[1]} transparent opacity={mode === "dark" ? 0.22 : 0.34} toneMapped={false} depthWrite={false} blending={mode === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending} />
      </mesh>
      <mesh ref={glow2}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshBasicMaterial color={pal.particles[2]} transparent opacity={mode === "dark" ? 0.1 : 0.18} toneMapped={false} depthWrite={false} blending={mode === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { rings.current[i] = m; }} rotation={[Math.PI / 2, 0, i * 0.6]}>
          <torusGeometry args={[1, 0.02 + i * 0.008, 8, 90]} />
          <meshBasicMaterial color={i === 1 ? pal.particles[1] : warm} transparent opacity={0} toneMapped={false} depthWrite={false} blending={mode === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ================================================================
   AMBIENT FLOATING GHOSTS — tiny drifting orbs for depth
   ================================================================ */
function GhostOrbs({ mode }: { mode: "light" | "dark" }) {
  const group = React.useRef<THREE.Group>(null);
  const pal = React.useMemo(() => palette(mode), [mode]);
  const orbs = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        p: new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.4) * 12, -4 - Math.random() * 10),
        s: 0.12 + Math.random() * 0.3,
        c: pal.particles[i % pal.particles.length],
        sp: 0.2 + Math.random() * 0.5,
        ph: Math.random() * Math.PI * 2,
      })),
    [pal.particles]
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((o, i) => {
      const d = orbs[i];
      o.position.set(
        d.p.x + Math.sin(t * d.sp + d.ph) * 1.2,
        d.p.y + Math.cos(t * d.sp * 0.8 + d.ph) * 1.5,
        d.p.z
      );
      const mat = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 * (1 - clamp01((t - 13.5) / 2));
    });
  });
  return (
    <group ref={group}>
      {orbs.map((o, i) => (
        <mesh key={i} position={o.p}>
          <sphereGeometry args={[o.s, 16, 16]} />
          <meshBasicMaterial color={o.c} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ================================================================
   SCENE — fog + everything
   ================================================================ */
function IntroWorld({ mode, isMobile }: { mode: "light" | "dark"; isMobile: boolean }) {
  const pal = React.useMemo(() => palette(mode), [mode]);
  const fogRef = React.useRef<THREE.Fog>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (fogRef.current) {
      fogRef.current.near = track(t, [
        [0, 9],
        [4.4, 7, smooth],
        [7.6, 10, smooth],
        [D.dive, 8, smooth],
        [D.end, 30, inCubic],
      ]);
      fogRef.current.far = track(t, [
        [0, 34],
        [D.dive, 30, smooth],
        [D.end, 60, inCubic],
      ]);
    }
  });
  return (
    <>
      <fog attach="fog" ref={fogRef} args={[pal.fog, 9, 34]} />
      <color attach="background" args={[pal.fog]} />
      <ambientLight intensity={pal.ambient} />
      <Rig mode={mode} />
      <NoiseCloud mode={mode} isMobile={isMobile} />
      <CandleSkyline mode={mode} isMobile={isMobile} />
      <SparkOrb mode={mode} />
      <GhostOrbs mode={mode} />
      {!isMobile && <Sparkles count={90} scale={[26, 16, 12]} size={mode === "dark" ? 1.6 : 2.4} speed={0.35} color={mode === "dark" ? pal.particles[0] : "#e08b45"} opacity={mode === "dark" ? 0.5 : 0.65} />}
    </>
  );
}

export default function IntroScene({ mode }: { mode: "light" | "dark" }) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.4, 17], fov: 58, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <IntroWorld mode={mode} isMobile={isMobile} />
    </Canvas>
  );
}
