import React, { useEffect, useRef } from 'react';

type Axis = 'x' | 'y' | 'z';
type Part = 'X_POS' | 'X_NEG' | 'Y_POS' | 'Y_NEG' | 'Z_POS' | 'Z_NEG';

type TargetPoint = {
  x: number;
  y: number;
  z: number;
  part: Part;
  color: string;
};

type StructureParticle = TargetPoint & {
  currX: number;
  currY: number;
  radius: number;
};

type EnvParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

const colorLeft = 'rgba(220, 38, 38, 0.35)';
const colorRight = 'rgba(251, 191, 36, 0.35)';
const colorPin = 'rgba(200, 255, 255, 0.6)';
const envColor = 'rgba(251, 191, 36, 0.5)';
const bgTrailColor = 'rgba(10, 0, 5, 0.2)';

const partOffsets: Record<Part, { x: number; y: number; z: number; delay: number }> = {
  X_POS: { x: 300, y: 0, z: 0, delay: 1200 },
  X_NEG: { x: -300, y: 0, z: 0, delay: 1400 },
  Y_POS: { x: 0, y: -260, z: 0, delay: 1700 },
  Y_NEG: { x: 0, y: 260, z: 0, delay: 1900 },
  Z_POS: { x: 0, y: 0, z: 300, delay: 2200 },
  Z_NEG: { x: 0, y: 0, z: -300, delay: 2400 },
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const toWorldPoint = (axis: Axis, u: number, v: number, w: number) => {
  if (axis === 'x') return { x: u, y: v, z: w };
  if (axis === 'y') return { x: v, y: u, z: w };
  return { x: v, y: w, z: u };
};

const isBeamSurface = (
  u: number,
  v: number,
  w: number,
  halfLength: number,
  halfWidth: number,
  step: number,
) =>
  Math.abs(u) >= halfLength - step ||
  Math.abs(v) >= halfWidth - step ||
  Math.abs(w) >= halfWidth - step;

const isLubanRelief = (u: number, v: number, w: number, beamIndex: number, slotLength: number, slotDepth: number) => {
  const inCore = Math.abs(u) < slotLength;
  if (!inCore) return false;

  switch (beamIndex % 3) {
    case 0:
      return v > 0 && Math.abs(w) < slotDepth;
    case 1:
      return w < 0 && Math.abs(v) < slotDepth;
    default:
      return v < 0 && w > -slotDepth;
  }
};

const createBeamTargets = (
  axis: Axis,
  partA: Part,
  partB: Part,
  color: string,
  beamIndex: number,
): TargetPoint[] => {
  const targets: TargetPoint[] = [];
  const halfLength = 112;
  const halfWidth = 18;
  const step = 12;
  const slotLength = 34;
  const slotDepth = 12;

  for (let u = -halfLength; u <= halfLength; u += step) {
    for (let v = -halfWidth; v <= halfWidth; v += step) {
      for (let w = -halfWidth; w <= halfWidth; w += step) {
        const surface = isBeamSurface(u, v, w, halfLength, halfWidth, step);
        const relief = isLubanRelief(u, v, w, beamIndex, slotLength, slotDepth);
        const coreEdge = Math.abs(u) < slotLength + step && (Math.abs(v) < step || Math.abs(w) < step);

        if (!surface && !relief && !coreEdge) continue;
        if (relief && !surface && Math.abs(u) > slotLength - step) continue;

        const part = u >= 0 ? partA : partB;
        const point = toWorldPoint(axis, u, v, w);
        targets.push({ ...point, part, color });
      }
    }
  }

  return targets;
};

const createLubanLockTargets = () => [
  ...createBeamTargets('x', 'X_POS', 'X_NEG', colorLeft, 0),
  ...createBeamTargets('y', 'Y_POS', 'Y_NEG', colorRight, 1),
  ...createBeamTargets('z', 'Z_POS', 'Z_NEG', colorPin, 2),
];

interface CanvasBackgroundProps {
  attractionRadius?: number
  assemblySpeed?: number
  clickBurstCount?: number
  envCountMobile?: number
  envCountDesktop?: number
}

const CanvasBackground: React.FC<CanvasBackgroundProps> = ({
  attractionRadius = 140,
  assemblySpeed = 0.02,
  clickBurstCount = 8,
  envCountMobile = 64,
  envCountDesktop = 96,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let centerX = viewportWidth * 0.45;
    let centerY = viewportHeight * 0.5;
    const startTime = performance.now();
    const targets = createLubanLockTargets();
    const envParticles: EnvParticle[] = [];
    const particles: StructureParticle[] = targets
      .map((target) => ({
        ...target,
        currX: Math.random() * viewportWidth,
        currY: Math.random() * viewportHeight,
        radius: Math.random() * 0.8 + 0.8,
      }))
      .sort((a, b) => a.color.localeCompare(b.color));

    const resetEnvParticles = () => {
      envParticles.length = 0;
      const envCount = viewportWidth < 768 ? envCountMobile : envCountDesktop;
      for (let i = 0; i < envCount; i += 1) {
        envParticles.push({
          x: Math.random() * viewportWidth,
          y: Math.random() * viewportHeight,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1 + 0.5,
        });
      }
    };

    const resize = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      centerX = viewportWidth * 0.45;
      centerY = viewportHeight * 0.5;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(viewportWidth * pixelRatio);
      canvas.height = Math.floor(viewportHeight * pixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      resetEnvParticles();
    };

    const drawEnvironment = () => {
      const cellSize = 80;
      const maxDistSq = cellSize * cellSize;
      const grid = new Map<string, number[]>();

      ctx.shadowBlur = 0;
      ctx.fillStyle = envColor;

      envParticles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > viewportWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > viewportHeight) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        const cellX = Math.floor(particle.x / cellSize);
        const cellY = Math.floor(particle.y / cellSize);
        const key = `${cellX}:${cellY}`;
        const bucket = grid.get(key);
        if (bucket) {
          bucket.push(index);
        } else {
          grid.set(key, [index]);
        }
      });

      envParticles.forEach((particle, index) => {
        const cellX = Math.floor(particle.x / cellSize);
        const cellY = Math.floor(particle.y / cellSize);

        for (let dx = -1; dx <= 1; dx += 1) {
          for (let dy = -1; dy <= 1; dy += 1) {
            const bucket = grid.get(`${cellX + dx}:${cellY + dy}`);
            if (!bucket) continue;

            bucket.forEach((otherIndex) => {
              if (otherIndex <= index) return;
              const other = envParticles[otherIndex];
              const lineX = particle.x - other.x;
              const lineY = particle.y - other.y;
              const distSq = lineX * lineX + lineY * lineY;
              if (distSq >= maxDistSq) return;

              const opacity = 0.15 * (1 - Math.sqrt(distSq) / cellSize);
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = `rgba(251, 191, 36, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            });
          }
        }
      });
    };

    let angleY = 0;
    const angleX = 0.26;
    const perspective = 820;

    // interaction state
    const mouse = { x: -9999, y: -9999, isDown: false };
    let assembled = true; // 榫卯是否组装
    let assemblyProgress = 1; // 0..1, 1 = assembled
    const lastClick = { t: 0 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const onClick = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastClick.t < 350) {
        // double-click → toggle assembly with strong particle burst
        assembled = !assembled;
        for (let i = 0; i < Math.max(24, clickBurstCount * 2); i += 1) {
          envParticles.push({
            x: e.clientX + (Math.random() - 0.5) * 120,
            y: e.clientY + (Math.random() - 0.5) * 120,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: Math.random() * 3 + 0.8,
          })
        }
      } else {
        // single click → spawn a small burst
        for (let i = 0; i < clickBurstCount; i += 1) {
          envParticles.push({
            x: e.clientX + (Math.random() - 0.5) * 24,
            y: e.clientY + (Math.random() - 0.5) * 24,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: Math.random() * 2 + 0.6,
          })
        }
      }
      lastClick.t = now;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click', onClick);

    const render = () => {
      if (hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      ctx.fillStyle = bgTrailColor;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      const elapsed = performance.now() - startTime;
      angleY += 0.0045;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      let activeColor = '';
      ctx.shadowBlur = 8;

        // gradually animate assembly/disassembly
        assemblyProgress += (assembled ? assemblySpeed : -assemblySpeed);
        if (assemblyProgress > 1) assemblyProgress = 1;
        if (assemblyProgress < 0) assemblyProgress = 0;

        particles.forEach((particle) => {
        const offset = partOffsets[particle.part];
        const progress = easeOutCubic(clamp01((elapsed - offset.delay) / 1500));
        const travel = 1 - progress;
        // when disassembled, amplify offsets according to assemblyProgress
        const separateScale = 1 + (1 - assemblyProgress) * 1.2;
        const animX = particle.x + offset.x * travel * separateScale;
        const animY = particle.y + offset.y * travel * separateScale;
        const animZ = particle.z + offset.z * travel * separateScale;

        const rx = animX * cosY - animZ * sinY;
        let rz = animZ * cosY + animX * sinY;
        const ry = animY * cosX - rz * sinX;
        rz = rz * cosX + animY * sinX;

        const scale = perspective / (perspective + rz);
        const targetScreenX = centerX + rx * scale;
        const targetScreenY = centerY + ry * scale;

        // apply attraction/repel to structure particles when mouse nearby
        const mx = mouse.x;
        const my = mouse.y;
        const dx = mx - particle.currX;
        const dy = my - particle.currY;
        const mDistSq = dx * dx + dy * dy;
        if (mDistSq < attractionRadius * attractionRadius) {
          // move slightly toward mouse and grow
          const mForce = 0.0025 * (1 - Math.sqrt(mDistSq) / attractionRadius);
          particle.currX += dx * mForce * 60;
          particle.currY += dy * mForce * 60;
          particle.radius = Math.min(4, particle.radius + 0.04);
        } else {
          // relax radius
          particle.radius += (Math.random() * 0.8 + 0.8 - particle.radius) * 0.02;
        }

        particle.currX += (targetScreenX - particle.currX) * 0.055;
        particle.currY += (targetScreenY - particle.currY) * 0.055;

        if (activeColor !== particle.color) {
          activeColor = particle.color;
          ctx.fillStyle = particle.color;
          ctx.shadowColor = particle.color;
        }

        ctx.beginPath();
        ctx.arc(particle.currX, particle.currY, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      drawEnvironment();
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();

    // Visibility check: pause when tab hidden
    let hidden = false;
    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden) render(); // resume immediately
    };
    document.addEventListener('visibilitychange', onVisibility);

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Also detect if element is scrolled out of view — skip render loop
  // (Already fixed inset-0, so this only matters if parent scrolls)

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

export default CanvasBackground;
