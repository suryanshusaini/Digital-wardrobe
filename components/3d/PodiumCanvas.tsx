"use client";

import {
  Suspense,
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  RoundedBox,
  useTexture,
} from "@react-three/drei";
import { useInView } from "framer-motion";
import * as THREE from "three";
import { podiumCloudinaryUrl } from "@/lib/cloudinaryUrl";

export interface PodiumItem {
  _id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags?: { weather: string[]; occasion: string[] };
}

// Consistent card dimensions for ALL items — 1.5 × 2.0 (3:4 ratio)
const CARD_W = 1.5;
const CARD_H = 2.0;
const CARD_D = 0.045;
const CARD_RADIUS = 0.06;

/**
 * Fallback UV repeat/offset computation for non-Cloudinary images or extreme aspect ratios.
 * Extreme aspect ratios fall back to 'contain' on the card background to avoid garment cut-off.
 */
function computeUV(
  texture: THREE.Texture,
  cardW: number,
  cardH: number
): { repeat: THREE.Vector2; offset: THREE.Vector2 } {
  const img = texture.image as
    | HTMLImageElement
    | ImageBitmap
    | { width: number; height: number }
    | undefined;
  const imgW =
    img && "naturalWidth" in img && typeof img.naturalWidth === "number" && img.naturalWidth > 0
      ? img.naturalWidth
      : img?.width ?? 1;
  const imgH =
    img && "naturalHeight" in img && typeof img.naturalHeight === "number" && img.naturalHeight > 0
      ? img.naturalHeight
      : img?.height ?? 1;
  const imgAspect = imgW / imgH;
  const cardAspect = cardW / cardH;

  // Extreme aspect ratio check: if aspect is severely wide (> 1.4) or tall (< 0.45), contain
  const isExtreme = imgAspect > 1.4 || imgAspect < 0.45;

  let repeatX = 1;
  let repeatY = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (isExtreme) {
    if (imgAspect > cardAspect) {
      repeatY = cardAspect / imgAspect;
      offsetY = (1 - repeatY) / 2;
    } else {
      repeatX = imgAspect / cardAspect;
      offsetX = (1 - repeatX) / 2;
    }
  } else {
    // Normal cover logic
    if (imgAspect > cardAspect) {
      repeatX = cardAspect / imgAspect;
      offsetX = (1 - repeatX) / 2;
    } else {
      repeatY = imgAspect / cardAspect;
      offsetY = (1 - repeatY) / 2;
    }
  }

  return {
    repeat: new THREE.Vector2(repeatX, repeatY),
    offset: new THREE.Vector2(offsetX, offsetY),
  };
}

function ClothingCard({
  url,
  isSelected,
  hovered,
  isDark,
}: {
  url: string;
  isSelected: boolean;
  hovered: boolean;
  isDark: boolean;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  // Load with pre-cropped Cloudinary URL (3:4 ratio), colorSpace SRGB, anisotropic filtering
  const texture = useTexture(podiumCloudinaryUrl(url), (loaded) => {
    if (loaded instanceof THREE.Texture) {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 4;
      const { repeat, offset } = computeUV(loaded, CARD_W, CARD_H);
      loaded.repeat.copy(repeat);
      loaded.offset.copy(offset);
      loaded.wrapS = THREE.ClampToEdgeWrapping;
      loaded.wrapT = THREE.ClampToEdgeWrapping;
      loaded.needsUpdate = true;
    }
  });

  // Texture cleanup on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Theme-aware card backing & subtle glow
  const baseColor = isDark ? 0x24211e : 0xffffff;
  const emissiveColor = isDark ? 0x3a332d : 0xf7f4ef;
  const emissiveIntensity = isSelected ? 0.05 : hovered ? 0.025 : 0.0;

  return (
    <RoundedBox
      args={[CARD_W, CARD_H, CARD_D]}
      radius={CARD_RADIUS}
      smoothness={4}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        ref={matRef}
        color={baseColor}
        map={texture}
        roughness={0.88}
        metalness={0.04}
        emissive={new THREE.Color(emissiveColor)}
        emissiveIntensity={emissiveIntensity}
      />
    </RoundedBox>
  );
}

function CarouselItem({
  item,
  angle,
  radius,
  isSelected,
  onSelect,
  reducedMotion,
  isDark,
  groupRotationY,
}: {
  item: PodiumItem;
  angle: number;
  radius: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  isDark: boolean;
  groupRotationY: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { invalidate } = useThree();

  const baseX = Math.sin(angle) * radius;
  const baseZ = Math.cos(angle) * radius;
  const baseY = 0.1;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const dampFactor = reducedMotion ? 50 : 5.5;

    // Calculate effective angle from front (0 radians)
    const effectiveAngle = (angle + groupRotationY) % (Math.PI * 2);
    const normalizedAngle = Math.atan2(Math.sin(effectiveAngle), Math.cos(effectiveAngle));
    const distFromFront = Math.abs(normalizedAngle); // 0 (front) to PI (back)
    
    // Scale down back-facing items (from 1.0 to 0.82) to eliminate visual clutter
    const depthScale = radius === 0 ? 1.0 : 1.0 - (distFromFront / Math.PI) * 0.18;

    // Selected item lifts slightly; hovered lifts a bit more
    const targetY =
      baseY +
      (isSelected ? 0.32 : 0) +
      (hovered && !isSelected ? 0.14 : 0) +
      (reducedMotion ? 0 : Math.sin(time * 1.2 + angle) * 0.016);

    const targetScale = (isSelected ? 1.05 : hovered ? 1.03 : 1.0) * depthScale;

    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY,
      dampFactor,
      delta
    );

    const current = groupRef.current.scale.x;
    const next = THREE.MathUtils.damp(current, targetScale, dampFactor, delta);
    groupRef.current.scale.set(next, next, next);

    if (Math.abs(current - targetScale) > 0.001) {
      invalidate();
    }
  });

  return (
    <group
      ref={groupRef}
      position={[baseX, baseY, baseZ]}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item._id);
        invalidate();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
        invalidate();
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
        invalidate();
      }}
    >
      <Suspense fallback={null}>
        <ClothingCard
          url={item.imageUrl}
          isSelected={isSelected}
          hovered={hovered}
          isDark={isDark}
        />
      </Suspense>
    </group>
  );
}

function SpotlightRig({ selectedId, isDark }: { selectedId: string | null; isDark: boolean }) {
  const intensityRef = useRef(1.4);
  const { invalidate } = useThree();

  useFrame((state, delta) => {
    const baseTarget = isDark ? 1.6 : 1.4;
    const targetIntensity = selectedId ? baseTarget * 1.5 : baseTarget;

    intensityRef.current = THREE.MathUtils.damp(
      intensityRef.current,
      targetIntensity,
      3.5,
      delta
    );

    const light = state.scene.getObjectByName("__spot__") as THREE.SpotLight;
    if (light) light.intensity = intensityRef.current;

    if (Math.abs(intensityRef.current - targetIntensity) > 0.01) {
      invalidate();
    }
  });

  return (
    <spotLight
      name="__spot__"
      position={[0, 6.5, 4.5]}
      angle={0.42}
      penumbra={0.9}
      intensity={1.4}
      castShadow
      shadow-bias={-0.0001}
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
  );
}

function Carousel({
  items,
  selectedId,
  onSelect,
  reducedMotion,
  isInteracting,
  dragDeltaX,
  onSnapIndex,
  isDark,
}: {
  items: PodiumItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  isInteracting: boolean;
  dragDeltaX: number;
  onSnapIndex: (index: number) => void;
  isDark: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const autoRotY = useRef(0);
  const targetRotY = useRef(0);
  const velocityY = useRef(0);
  const [currentGroupRotY, setCurrentGroupRotY] = useState(0);
  const { invalidate } = useThree();

  const count = items.length;

  // Mathematical radius calculation:
  // N = 1 -> R = 0 (perfectly centered card)
  // N = 2 -> R = 1.6
  // N = 3 -> R = 2.1
  // N >= 4 -> R = (CARD_W + gap) / (2 * sin(PI / N)), clamped to [2.2, 3.8]
  const radius = useMemo(() => {
    if (count <= 1) return 0;
    if (count === 2) return 1.6;
    if (count === 3) return 2.1;
    const gap = 0.6;
    const calcR = (CARD_W + gap) / (2 * Math.sin(Math.PI / count));
    return Math.min(Math.max(calcR, 2.2), 3.8);
  }, [count]);

  const selectedIndex = useMemo(
    () => Math.max(0, items.findIndex((i) => i._id === selectedId)),
    [items, selectedId]
  );

  // Direct drag manipulation
  useEffect(() => {
    if (isInteracting && dragDeltaX !== 0) {
      const rotDelta = (dragDeltaX / 400) * Math.PI;
      targetRotY.current += rotDelta;
      velocityY.current = rotDelta * 0.4;
      invalidate();
    }
  }, [dragDeltaX, isInteracting, invalidate]);

  // Snap to nearest item when interaction ends
  const snapToNearest = useCallback(() => {
    if (count <= 1) return;
    const anglePerItem = (Math.PI * 2) / count;
    const rawIdx = Math.round(-targetRotY.current / anglePerItem) % count;
    const nearestIdx = (rawIdx + count) % count;
    targetRotY.current = -nearestIdx * anglePerItem;
    onSnapIndex(nearestIdx);
  }, [count, onSnapIndex]);

  useEffect(() => {
    if (!isInteracting && dragDeltaX === 0) {
      snapToNearest();
    }
  }, [isInteracting, dragDeltaX, snapToNearest]);

  useFrame((_, delta) => {
    if (!group.current) return;

    const dampFactor = reducedMotion ? 50 : 3.8;

    if (count > 1) {
      if (selectedId && !isInteracting) {
        const targetAngle = -((selectedIndex / count) * Math.PI * 2);
        targetRotY.current = targetAngle;
      } else if (!isInteracting && !reducedMotion) {
        // Idle momentum and slow auto-rotation
        if (Math.abs(velocityY.current) > 0.0005) {
          targetRotY.current += velocityY.current;
          velocityY.current *= 0.92;
        } else {
          targetRotY.current += delta * 0.12;
        }
      }

      autoRotY.current = THREE.MathUtils.damp(
        autoRotY.current,
        targetRotY.current,
        dampFactor,
        delta
      );

      group.current.rotation.y = autoRotY.current;
      setCurrentGroupRotY(autoRotY.current);

      // Keep calling invalidate() while auto-rotating or settling under frameloop="demand"
      invalidate();
    }
  });

  // Windowing for large N: if N > 7, only mount the 7 items closest to the active view angle
  const visibleIndices = useMemo(() => {
    if (count <= 7) {
      return items.map((_, i) => i);
    }
    const anglePerItem = (Math.PI * 2) / count;
    const currentCenterIdx = (Math.round(-currentGroupRotY / anglePerItem) % count + count) % count;
    const indices: number[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      indices.push((currentCenterIdx + offset + count) % count);
    }
    return indices;
  }, [count, currentGroupRotY, items]);

  return (
    <group ref={group} position={[0, 0.3, 0]}>
      {visibleIndices.map((i) => {
        const item = items[i];
        if (!item) return null;
        const angle = count <= 1 ? 0 : (i / count) * Math.PI * 2;
        return (
          <CarouselItem
            key={item._id}
            item={item}
            angle={angle}
            radius={radius}
            isSelected={selectedId === item._id}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
            isDark={isDark}
            groupRotationY={currentGroupRotY}
          />
        );
      })}
    </group>
  );
}

export default function PodiumCanvas({
  items,
  selectedId,
  onSelect,
  onContextLost,
  isDark = false,
}: {
  items: PodiumItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextLost?: () => void;
  isDark?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "80px" });
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  const [reducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const [isInteracting, setIsInteracting] = useState(false);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const lastClientX = useRef<number | null>(null);
  const idleResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tab visibility check for render loop control
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const handleVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  // Keyboard navigation: ArrowLeft/Right cycles, Escape clears
  useEffect(() => {
    const el = containerRef.current;
    if (!el || items.length <= 1) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        const idx = items.findIndex((i) => i._id === selectedId);
        const next = items[(idx + 1) % items.length];
        if (next) onSelect(next._id);
      } else if (e.key === "ArrowLeft") {
        const idx = items.findIndex((i) => i._id === selectedId);
        const prev = items[(idx - 1 + items.length) % items.length];
        if (prev) onSelect(prev._id);
      } else if (e.key === "Escape") {
        onSelect("");
      }
    };
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  }, [items, selectedId, onSelect]);

  // Pointer & Swipe interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (items.length <= 1) return;
    lastClientX.current = e.clientX;
    setIsInteracting(true);
    setDragDeltaX(0);
    if (idleResumeTimer.current) clearTimeout(idleResumeTimer.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isInteracting || lastClientX.current === null) return;
    const delta = e.clientX - lastClientX.current;
    lastClientX.current = e.clientX;
    setDragDeltaX(delta);
  };

  const handlePointerUp = () => {
    lastClientX.current = null;
    setDragDeltaX(0);
    if (idleResumeTimer.current) clearTimeout(idleResumeTimer.current);
    // Pause auto-rotate for ~4s after interaction before resuming
    idleResumeTimer.current = setTimeout(() => {
      setIsInteracting(false);
    }, 4000);
  };

  const handleSnapIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        onSelect(item._id);
      }
    },
    [items, onSelect]
  );

  useEffect(() => {
    return () => {
      if (glRef.current) glRef.current.dispose();
      THREE.Cache.clear();
      if (idleResumeTimer.current) clearTimeout(idleResumeTimer.current);
    };
  }, []);

  // Theme-derived scene colours
  const bgColor = isDark ? "#141210" : "#f8f7f5";
  const shadowColor = isDark ? "#000000" : "#1c1917";
  const shadowOpacity = isDark ? 0.75 : 0.55;

  return (
    <div
      ref={containerRef}
      className="h-full w-full outline-none select-none"
      tabIndex={0}
      aria-label="3D boutique showcase. Swipe or drag to rotate, use arrow keys to navigate."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        // Frameloop is completely halted when off-screen, tab hidden, or reduced-motion
        frameloop={!isInView || !tabVisible || (reducedMotion && !isInteracting) ? "never" : "demand"}
        camera={{ position: [0, 1.2, 8.4], fov: 36 }}
        style={{ touchAction: "pan-y" }}
        gl={{
          powerPreference: "high-performance",
          antialias: true,
          alpha: true,
        }}
        onPointerMissed={() => onSelect("")}
        onCreated={({ gl }) => {
          glRef.current = gl;
          // passive: true — lets the browser compositor scroll the page immediately
          // without waiting for JS. stopPropagation prevents R3F's internal onWheel
          // handler from consuming the event after DOM bubbling.
          gl.domElement.addEventListener(
            "wheel",
            (e) => e.stopPropagation(),
            { passive: true }
          );
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event: Event) => {
              event.preventDefault();
              onContextLost?.();
            },
            false
          );
        }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 9, 23]} />

        {/* ── Studio Lighting — native Three.js only, no Drei Environment ── */}
        <ambientLight intensity={isDark ? 0.35 : 0.45} />

        {/* Key light — main directional with shadow map */}
        <directionalLight
          castShadow
          position={[3.5, 7, 4]}
          intensity={isDark ? 1.25 : 1.1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        {/* Fill light — cool rim from left-rear */}
        <directionalLight position={[-3.5, 2.5, -2]} intensity={0.28} />
        {/* Warm backlight — separates cards from background */}
        <directionalLight position={[0, 3, -5]} intensity={0.22} color="#fff8f0" />

        {/* Animated spotlight driven by SpotlightRig */}
        <SpotlightRig selectedId={selectedId} isDark={isDark} />

        {/* Soft fill spotLight replacing the Lightformers */}
        <spotLight
          position={[-5, 5, 10]}
          intensity={isDark ? 0.4 : 0.5}
          penumbra={1}
          angle={0.5}
          color={isDark ? "#ffe8d6" : "#ffffff"}
        />

        <ContactShadows
          position={[0, -0.95, 0]}
          opacity={shadowOpacity}
          scale={11}
          blur={3.0}
          far={4}
          frames={1}
          color={shadowColor}
        />

        <Carousel
          items={items}
          selectedId={selectedId}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          isInteracting={isInteracting}
          dragDeltaX={dragDeltaX}
          onSnapIndex={handleSnapIndex}
          isDark={isDark}
        />
      </Canvas>
    </div>
  );
}
