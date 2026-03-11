"use client"

import type { Side } from "@/lib/door-specs"

interface SliderDiagramProps {
  width?: string
  height?: string
  slideSide?: Side
  className?: string
}

export function SliderDoorDiagram({
  width,
  height,
  slideSide,
  className,
}: SliderDiagramProps) {
  const svgW = 280
  const svgH = 300
  const pad = 40

  const openingX = pad + 20
  const openingY = pad + 10
  const openingW = svgW - openingX - pad
  const openingH = svgH - pad * 2 - 20

  // Door panel (offset to one side based on slide direction)
  const panelW = openingW * 0.55
  const isLeft = slideSide === "LEFT"
  const panelX = isLeft ? openingX : openingX + openingW - panelW

  // Track at top
  const trackY = openingY - 6
  const trackH = 6

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={className}
      style={{ maxWidth: 260, width: "100%" }}
    >
      {/* Track */}
      <rect
        x={openingX - 10}
        y={trackY}
        width={openingW + 20}
        height={trackH}
        fill="#9ca3af"
        rx={2}
      />

      {/* Opening */}
      <rect
        x={openingX}
        y={openingY}
        width={openingW}
        height={openingH}
        fill="#f0f9ff"
        stroke="#374151"
        strokeWidth={2}
        strokeDasharray="6 3"
        rx={2}
      />

      {/* Door panel */}
      <rect
        x={panelX}
        y={openingY + 2}
        width={panelW}
        height={openingH - 4}
        fill="#dbeafe"
        stroke="#2563eb"
        strokeWidth={1.5}
        rx={2}
      />

      {/* Slide direction arrow */}
      {slideSide && (
        <>
          <line
            x1={isLeft ? panelX + panelW - 20 : panelX + 20}
            y1={openingY + openingH / 2}
            x2={isLeft ? panelX + 10 : panelX + panelW - 10}
            y2={openingY + openingH / 2}
            stroke="#2563eb"
            strokeWidth={2}
            markerEnd="url(#slider-arrowhead)"
          />
          <defs>
            <marker id="slider-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#2563eb" />
            </marker>
          </defs>
          <text
            x={panelX + panelW / 2}
            y={openingY + openingH / 2 + 18}
            textAnchor="middle"
            fontSize={10}
            fill="#2563eb"
            fontWeight={500}
          >
            Slides {isLeft ? "Left" : "Right"}
          </text>
        </>
      )}

      {/* Width dimension line */}
      <line x1={openingX} y1={openingY - 18} x2={openingX + openingW} y2={openingY - 18} stroke="#2563eb" strokeWidth={1} />
      <line x1={openingX} y1={openingY - 24} x2={openingX} y2={openingY - 12} stroke="#2563eb" strokeWidth={1} />
      <line x1={openingX + openingW} y1={openingY - 24} x2={openingX + openingW} y2={openingY - 12} stroke="#2563eb" strokeWidth={1} />
      <text
        x={openingX + openingW / 2}
        y={openingY - 24}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#2563eb"
      >
        {width || "Width"}
      </text>

      {/* Height dimension line */}
      <line x1={openingX - 16} y1={openingY} x2={openingX - 16} y2={openingY + openingH} stroke="#2563eb" strokeWidth={1} />
      <line x1={openingX - 22} y1={openingY} x2={openingX - 10} y2={openingY} stroke="#2563eb" strokeWidth={1} />
      <line x1={openingX - 22} y1={openingY + openingH} x2={openingX - 10} y2={openingY + openingH} stroke="#2563eb" strokeWidth={1} />
      <text
        x={openingX - 26}
        y={openingY + openingH / 2}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#2563eb"
        transform={`rotate(-90 ${openingX - 26} ${openingY + openingH / 2})`}
      >
        {height || "Height"}
      </text>

      {/* Label */}
      <text
        x={svgW / 2 + 10}
        y={svgH - 6}
        textAnchor="middle"
        fontSize={10}
        fill="#9ca3af"
      >
        Front View — Slider Door
      </text>
    </svg>
  )
}
