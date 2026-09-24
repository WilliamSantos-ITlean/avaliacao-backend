import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const STAR: [number, number][] = [
  [16, 1.6],
  [19.1, 12.2],
  [30.4, 16],
  [19.1, 19.8],
  [16, 30.4],
  [12.9, 19.8],
  [1.6, 16],
  [12.9, 12.2],
];

function starShape() {
  const scale = 0.078;
  const points = STAR.map(([x, y]) => new THREE.Vector2((x - 16) * scale, (16 - y) * scale));
  const count = points.length;
  const shape = new THREE.Shape();
  const soften = (index: number) => (index % 2 === 0 ? 0.34 : 0.16);
  const before = (index: number) => {
    const tip = points[index];
    const prev = points[(index - 1 + count) % count];
    return tip.clone().lerp(prev, soften(index));
  };
  const after = (index: number) => {
    const tip = points[index];
    const next = points[(index + 1) % count];
    return tip.clone().lerp(next, soften(index));
  };

  const start = before(0);
  shape.moveTo(start.x, start.y);
  for (let index = 0; index < count; index += 1) {
    const tip = points[index];
    const end = after(index);
    shape.quadraticCurveTo(tip.x, tip.y, end.x, end.y);
    const next = before((index + 1) % count);
    shape.lineTo(next.x, next.y);
  }
  return shape;
}

function MarkMesh() {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(starShape(), {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.045,
        bevelSegments: 4,
        curveSegments: 16,
      }).center(),
    [],
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const ease = 1 - Math.exp(-delta * 4);
    node.rotation.y += (pointer.current.x * 1.05 - node.rotation.y) * ease;
    node.rotation.x += (pointer.current.y * 0.5 - node.rotation.x) * ease;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#f6f1e8" metalness={0.2} roughness={0.42} />
      </mesh>
    </group>
  );
}

export function NorteScene() {
  return (
    <div className="gate-scene" aria-hidden="true">
      <Canvas
        frameloop="always"
        camera={{ position: [0, 0, 6.4], fov: 30 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2.2, 2.4, 3]} intensity={1.6} />
        <directionalLight position={[-2, -1, 1]} intensity={0.35} color="#e7cbb0" />
        <MarkMesh />
      </Canvas>
    </div>
  );
}
