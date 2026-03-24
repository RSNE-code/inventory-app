"use client"

import { useEffect, useMemo } from "react"

interface CelebrationOverlayProps {
  variant: number
  onComplete: () => void
}

/**
 * Full-screen celebration animation with 6 CSS-only variants.
 * Auto-dismisses after 1000ms.
 */
export function CelebrationOverlay({ variant, onComplete }: CelebrationOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="celebration-overlay fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {variant === 0 && <RadialPulse />}
      {variant === 1 && <Starburst />}
      {variant === 2 && <ParticleRise />}
      {variant === 3 && <RingCascade />}
      {variant === 4 && <CheckmarkBloom />}
      {variant === 5 && <GravityScatter />}
    </div>
  )
}

/** Variant 0: Concentric rings expand from center */
function RadialPulse() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            borderColor: i % 2 === 0 ? "var(--color-brand-blue)" : "var(--color-brand-orange)",
            width: 40,
            height: 40,
            opacity: 0,
            animation: `radial-pulse-ring 0.8s var(--ease-out) ${i * 0.12}s both`,
          }}
        />
      ))}
    </div>
  )
}

/** Variant 1: Rays radiate from center */
function Starburst() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 3,
            height: 24,
            borderRadius: 2,
            background: i % 3 === 0 ? "var(--color-brand-orange)" : i % 3 === 1 ? "var(--color-brand-blue)" : "var(--color-status-green)",
            transformOrigin: "center 120px",
            transform: `rotate(${i * 30}deg)`,
            opacity: 0,
            animation: `starburst-ray 0.7s var(--ease-out) ${i * 0.03}s both`,
          }}
        />
      ))}
    </div>
  )
}

/** Variant 2: Particles rise from bottom */
function ParticleRise() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      left: `${8 + Math.random() * 84}%`,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.3,
      color: i % 3 === 0 ? "var(--color-brand-blue)" : i % 3 === 1 ? "var(--color-brand-orange)" : "var(--color-status-green)",
      drift: -20 + Math.random() * 40,
    })),
  [])

  return (
    <div className="absolute inset-0">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: 0,
            animation: `particle-rise 0.9s var(--ease-out) ${p.delay}s both`,
            // @ts-expect-error CSS custom property for drift
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

/** Variant 3: Rings expand sequentially */
function RingCascade() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 20,
            height: 20,
            border: `2px solid ${i % 2 === 0 ? "var(--color-brand-blue)" : "var(--color-brand-orange)"}`,
            opacity: 0,
            animation: `ring-cascade 0.6s var(--ease-out) ${i * 0.08}s both`,
          }}
        />
      ))}
    </div>
  )
}

/** Variant 4: Checkmark draws itself with ring */
function CheckmarkBloom() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="absolute rounded-full border-2 border-status-green"
        style={{
          width: 48,
          height: 48,
          opacity: 0,
          animation: "bloom-ring 0.8s var(--ease-out) both",
        }}
      />
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        className="relative"
        style={{ opacity: 0, animation: "bloom-check 0.5s var(--ease-spring) 0.2s both" }}
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="var(--color-status-green)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="30"
          strokeDashoffset="30"
          style={{ animation: "bloom-draw 0.4s ease-out 0.3s both" }}
        />
      </svg>
    </div>
  )
}

/** Variant 5: Shapes fall from top with bounce */
function GravityScatter() {
  const shapes = useMemo(() =>
    Array.from({ length: 14 }).map((_, i) => ({
      left: `${5 + Math.random() * 90}%`,
      size: 5 + Math.random() * 7,
      delay: Math.random() * 0.25,
      color: i % 3 === 0 ? "var(--color-brand-blue)" : i % 3 === 1 ? "var(--color-brand-orange)" : "var(--color-status-green)",
      isCircle: Math.random() > 0.5,
    })),
  [])

  return (
    <div className="absolute inset-0">
      {shapes.map((s, i) => (
        <div
          key={i}
          className={s.isCircle ? "absolute rounded-full" : "absolute rounded-sm"}
          style={{
            left: s.left,
            top: -12,
            width: s.size,
            height: s.size,
            background: s.color,
            opacity: 0,
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `gravity-fall 0.8s var(--ease-in-out) ${s.delay}s both`,
          }}
        />
      ))}
    </div>
  )
}
