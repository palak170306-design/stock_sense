"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

/* Floating candle field that greets you after the intro dive —
   the visual continuation of the skyline-to-orb merge. */

function ParallaxCam() {
  const target = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 1.6;
      target.current.y = -(e.clientY / window.innerHeight - 0.5) * 1.1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  useFrame((state) => {
    const camera = state.camera;
    const t = state.clock.getElapsedTime();
    const k = 0.045;
    camera.position.x += (target.current.x + Math.sin(t * 0.4) * 0.3 - camera.position.x) * k;
    camera.position.y += (target.current.y + Math.cos(t * 0.3) * 0.2 - camera.position.y) * k;
    camera.lookAt(0, 0.4, 0);
  });
  return null;
}

type C = { p: THREE.Vector3; h: number; up: boolean; ph: number; sp: number; s: number };
const PASTELS = ["#ffb27a", "#ff8fc0", "#7cc9ff", "#7fe3b1", "#ffd884"];
function CandleField({ isMobile }: { isMobile: boolean }) {
  const COUNT = isMobile ? 22 : 40;
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);

  const candles = React.useMemo<C[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const a = (i / COUNT) * Math.PI * 2 + Math.random() * 0.6;
      const r = 4.5 + Math.random() * 5.5;
      return {
        p: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 7.5, Math.sin(a) * r * 0.55 - 2),
        h: 0.5 + Math.random() * 1.9,
        up: i % 3 !== 2,
        ph: Math.random() * Math.PI * 2,
        sp: 0.3 + Math.random() * 0.6,
        s: 0.7 + Math.random() * 0.6,
      };
    });
  }, [COUNT]);

  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      c.set(candles[i].up ? "#2fd08c" : "#ff7d99");
      c.offsetHSL(0, 0, (Math.random() - 0.4) * 0.12);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [candles, COUNT]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < COUNT; i++) {
      const d = candles[i];
      const bob = Math.sin(t * d.sp + d.ph);
      dummy.position.set(d.p.x, d.p.y + bob * 0.55, d.p.z);
      dummy.rotation.set(bob * 0.08, t * 0.12 * d.sp + d.ph, bob * 0.05);
      dummy.scale.set(0.24 * d.s, d.h * (0.92 + Math.sin(t * 1.4 + d.ph) * 0.05), 0.24 * d.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.82} toneMapped={false} />
    </instancedMesh>
  );
}

function AmbientOrbs({ isMobile }: { isMobile: boolean }) {
  const N = isMobile ? 6 : 12;
  const group = React.useRef<THREE.Group>(null);
  const orbs = React.useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        p: new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -3 - Math.random() * 8),
        s: 0.15 + Math.random() * 0.45,
        c: PASTELS[i % PASTELS.length],
        ph: Math.random() * Math.PI * 2,
        sp: 0.2 + Math.random() * 0.4,
      })),
    [N]
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((o, i) => {
      const d = orbs[i];
      o.position.y = d.p.y + Math.sin(t * d.sp + d.ph) * 0.9;
      o.position.x = d.p.x + Math.cos(t * d.sp * 0.7 + d.ph) * 0.6;
    });
  });
  return (
    <group ref={group}>
      {orbs.map((o, i) => (
        <mesh key={i} position={o.p}>
          <sphereGeometry args={[o.s, 16, 16]} />
          <meshBasicMaterial color={o.c} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroScene() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.6, 10.5], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ParallaxCam />
      <CandleField isMobile={isMobile} />
      <AmbientOrbs isMobile={isMobile} />
      <Sparkles count={isMobile ? 50 : 110} scale={[22, 12, 10]} size={1.8} speed={0.3} color="#ffb27a" opacity={0.55} />
    </Canvas>
  );
}
