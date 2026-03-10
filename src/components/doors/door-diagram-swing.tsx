"use client"

import type { Cutout } from "@/lib/door-specs"

interface SwingDiagramProps {
  width?: string
  height?: string
  jambDepth?: string
  sillHeight?: string
  cutouts?: Cutout[]
  className?: string
}

export function SwingDoorDiagram({
  width,
  height,
  jambDepth,
  sillHeight,
  cutouts,
  className,
}: SwingDiagramProps) {
  // SVG viewBox dimensions
  const svgW = 280
  const svgH = 340
  const pad = 40

  // Door frame rectangle
  const frameX = pad + 30
  const frameY = pad
  const frameW = svgW - frameX - pad
  const frameH = svgH - pad * 2

  // Door opening (inside frame)
  const jambW = 12
  const doorX = frameX + jambW
  const doorY = frameY + jambW
  const doorW = frameW - jambW * 2
  const doorH = frameH - jambW - (sillHeight ? 24 : 0)

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={className}
      style={{ maxWidth: 260, width: "100%" }}
    >
      {/* Frame outline */}
      <rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill="#e5e7eb"
        stroke="#374151"
        strokeWidth={2}
        rx={2}
      />

      {/* Door opening */}
      <rect
        x={doorX}
        y={doorY}
        width={doorW}
        height={doorH}
        fill="#f0f9ff"
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeDasharray="4 2"
        rx={1}
      />

      {/* High sill area */}
      {sillHeight && (
        <rect
          x={doorX}
          y={doorY + doorH}
          width={doorW}
          height={20}
          fill="#fef3c7"
          stroke="#d97706"
          strokeWidth={1}
        />
      )}

      {/* Cutout rectangles */}
      {cutouts?.map((cutout, i) => {
        const cW = doorW * 0.4
        const cX = doorX + (doorW - cW) / 2
        const cH = 20
        const cY = doorY + doorH * 0.3 + i * 30
        return (
          <rect
            key={i}
            x={cX}
            y={cY}
            width={cW}
            height={cH}
            fill="none"
            stroke="#9333ea"
            strokeWidth={1.5}
            strokeDasharray="3 2"
            rx={1}
          />
        )
      })}

      {/* Width dimension line (top) */}
      <line x1={doorX} y1={frameY - 12} x2={doorX + doorW} y2={frameY - 12} stroke="#2563eb" strokeWidth={1} />
      <line x1={doorX} y1={frameY - 18} x2={doorX} y2={frameY - 6} stroke="#2563eb" strokeWidth={1} />
      <line x1={doorX + doorW} y1={frameY - 18} x2={doorX + doorW} y2={frameY - 6} stroke="#2563eb" strokeWidth={1} />
      <text
        x={doorX + doorW / 2}
        y={frameY - 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#2563eb"
      >
        {width || "Width"}
      </text>

      {/* Height dimension line (left) */}
      <line x1={frameX - 16} y1={doorY} x2={frameX - 16} y2={doorY + doorH} stroke="#2563eb" strokeWidth={1} />
      <line x1={frameX - 22} y1={doorY} x2={frameX - 10} y2={doorY} stroke="#2563eb" strokeWidth={1} />
      <line x1={frameX - 22} y1={doorY + doorH} x2={frameX - 10} y2={doorY + doorH} stroke="#2563eb" strokeWidth={1} />
      <text
        x={frameX - 26}
        y={doorY + doorH / 2}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#2563eb"
        transform={`rotate(-90 ${frameX - 26} ${doorY + doorH / 2})`}
      >
        {height || "Height"}
      </text>

      {/* Jamb depth label (right side) */}
      <line x1={frameX + frameW + 6} y1={doorY} x2={frameX + frameW + 6} y2={doorY + jambW + 10} stroke="#6b7280" strokeWidth={1} />
      <text
        x={frameX + frameW + 10}
        y={doorY + jambW + 6}
        fontSize={9}
        fill="#6b7280"
      >
        {jambDepth ? `Jamb: ${jambDepth}` : "Jamb"}
      </text>

      {/* Sill height label */}
      {sillHeight && (
        <text
          x={doorX + doorW / 2}
          y={doorY + doorH + 14}
          textAnchor="middle"
          fontSize={9}
          fill="#d97706"
          fontWeight={500}
        >
          Sill: {sillHeight}
        </text>
      )}

      {/* Label */}
      <text
        x={svgW / 2 + 15}
        y={svgH - 6}
        textAnchor="middle"
        fontSize={10}
        fill="#9ca3af"
      >
        Front View — Swing Door
      </text>
    </svg>
  )
}
