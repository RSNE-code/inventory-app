"use client"

import type { DoorSpecs } from "@/lib/door-specs"

interface DoorPreviewProps {
  specs: Partial<DoorSpecs>
  className?: string
}

/** Finish → panel fill color */
const FINISH_COLORS: Record<string, string> = {
  "WPG (White Painted Galv)": "#F8F9FA",
  "White/White": "#FAFBFC",
  "Stainless Steel": "#C0C7CE",
  "Galvalume": "#A8ADB3",
}

function getFinishColor(finish?: string): string {
  if (!finish) return "#EDF2F7"
  // Check exact match first, then partial
  if (FINISH_COLORS[finish]) return FINISH_COLORS[finish]
  const lower = finish.toLowerCase()
  if (lower.includes("wpg") || lower.includes("white")) return "#F8F9FA"
  if (lower.includes("stainless") || lower.includes("ss")) return "#C0C7CE"
  if (lower.includes("galvalume") || lower.includes("galv")) return "#A8ADB3"
  if (lower.includes("frp")) return "#D5CDC4"
  return "#EDF2F7"
}

/**
 * Unified door configurator SVG that updates as specs change.
 * Shows frame, panel finish, hardware, temperature, cutouts, sill, dimensions.
 */
export function DoorPreview({ specs, className }: DoorPreviewProps) {
  const isSlider = specs.openingType === "SLIDE"
  const svgW = 240
  const svgH = 300
  const pad = 36

  // Frame
  const frameX = pad + 20
  const frameY = pad
  const frameW = svgW - frameX - pad
  const frameH = svgH - pad - 30

  // Frame thickness by type
  const frameThick = specs.frameType === "FACE_FRAME" ? 6
    : specs.frameType === "BALLY_TYPE" ? 10
    : 8 // FULL_FRAME default

  // Door panel (inside frame)
  const panelX = frameX + frameThick
  const panelY = frameY + frameThick
  const panelW = frameW - frameThick * 2
  const sillH = specs.highSill ? 16 : 0
  const panelH = frameH - frameThick - sillH - (specs.highSill ? 0 : frameThick)

  // Finish color
  const fillColor = getFinishColor(specs.finish)

  // Hardware
  const hingeSide = specs.hingeSide || (specs.openingType === "HINGE" ? "RIGHT" : undefined)
  const hingeOnLeft = hingeSide === "LEFT"
  const widthNum = specs.widthInClear ? parseFloat(specs.widthInClear) : 36
  const hingeCount = widthNum > 36 ? 3 : 2
  const hingeX = hingeOnLeft ? panelX + 4 : panelX + panelW - 4
  const latchX = hingeOnLeft ? panelX + panelW - 6 : panelX + 6

  // Slider
  const sliderPanelW = panelW * 0.55
  const sliderIsLeft = specs.slideSide === "LEFT"
  const sliderPanelX = sliderIsLeft ? panelX : panelX + panelW - sliderPanelW

  // Temperature
  const isFreeze = specs.temperatureType === "FREEZER"
  const isCool = specs.temperatureType === "COOLER"

  const ts: React.CSSProperties = { transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }

  return (
    <div
      className={className}
      style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(11,29,58,0.03) 19px, rgba(11,29,58,0.03) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(11,29,58,0.03) 19px, rgba(11,29,58,0.03) 20px)",
        borderRadius: 12,
        padding: 4,
      }}
    >
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", maxWidth: 200, display: "block", margin: "0 auto" }}>
        {/* Frame outline */}
        <rect
          x={frameX} y={frameY} width={frameW} height={frameH}
          fill="var(--color-navy)"
          opacity={0.12}
          rx={3}
          style={ts}
        />
        <rect
          x={frameX} y={frameY} width={frameW} height={frameH}
          fill="none"
          stroke="var(--color-navy)"
          strokeWidth={2}
          rx={3}
          style={ts}
        />

        {isSlider ? (
          <>
            {/* Track at top */}
            <rect
              x={frameX - 4} y={frameY - 4}
              width={frameW + 8} height={5}
              fill="var(--color-navy)" opacity={0.3} rx={2}
            />

            {/* Opening */}
            <rect
              x={panelX} y={panelY} width={panelW} height={panelH}
              fill="#F0F4F8"
              stroke="var(--color-brand-blue)" strokeWidth={1} strokeDasharray="4 2"
              rx={2}
            />

            {/* Slider panel */}
            <rect
              x={sliderPanelX} y={panelY + 2}
              width={sliderPanelW} height={panelH - 4}
              fill={fillColor}
              stroke="var(--color-navy)" strokeWidth={1.5}
              rx={2}
              style={ts}
            />

            {/* Slide direction arrow */}
            {specs.slideSide && (
              <g style={ts}>
                <line
                  x1={sliderIsLeft ? sliderPanelX + sliderPanelW - 16 : sliderPanelX + 16}
                  y1={panelY + panelH / 2}
                  x2={sliderIsLeft ? sliderPanelX + 8 : sliderPanelX + sliderPanelW - 8}
                  y2={panelY + panelH / 2}
                  stroke="var(--color-brand-blue)" strokeWidth={2}
                />
                <polygon
                  points={sliderIsLeft
                    ? `${sliderPanelX + 8},${panelY + panelH / 2 - 4} ${sliderPanelX + 8},${panelY + panelH / 2 + 4} ${sliderPanelX + 2},${panelY + panelH / 2}`
                    : `${sliderPanelX + sliderPanelW - 8},${panelY + panelH / 2 - 4} ${sliderPanelX + sliderPanelW - 8},${panelY + panelH / 2 + 4} ${sliderPanelX + sliderPanelW - 2},${panelY + panelH / 2}`
                  }
                  fill="var(--color-brand-blue)"
                />
              </g>
            )}
          </>
        ) : (
          <>
            {/* Door panel */}
            <rect
              x={panelX} y={panelY} width={panelW} height={panelH}
              fill={fillColor}
              stroke="var(--color-navy)" strokeWidth={1} strokeOpacity={0.3}
              rx={2}
              style={ts}
            />

            {/* High sill */}
            {specs.highSill && (
              <rect
                x={panelX} y={panelY + panelH}
                width={panelW} height={sillH}
                fill="var(--color-brand-orange)" opacity={0.2}
                stroke="var(--color-brand-orange)" strokeWidth={1} strokeOpacity={0.5}
                rx={1}
                style={ts}
              />
            )}

            {/* Hinges */}
            {hingeSide && Array.from({ length: hingeCount }).map((_, i) => {
              const spacing = panelH / (hingeCount + 1)
              const cy = panelY + spacing * (i + 1)
              return (
                <circle
                  key={`hinge-${i}`}
                  cx={hingeX} cy={cy} r={4}
                  fill="var(--color-navy)" opacity={0.7}
                  stroke="var(--color-navy)" strokeWidth={1}
                  style={ts}
                />
              )
            })}

            {/* Latch */}
            {hingeSide && (
              <circle
                cx={latchX} cy={panelY + panelH * 0.42} r={3.5}
                fill="var(--color-brand-orange)" opacity={0.8}
                stroke="var(--color-brand-orange)" strokeWidth={1}
                style={ts}
              />
            )}

            {/* Closer arm at top */}
            {specs.closerModel && (
              <rect
                x={hingeOnLeft ? panelX + 2 : panelX + panelW - 18}
                y={panelY + 3}
                width={16} height={4}
                fill="var(--color-navy)" opacity={0.5}
                rx={2}
                style={ts}
              />
            )}

            {/* Cutouts */}
            {specs.cutouts?.map((_, i) => {
              const cW = panelW * 0.35
              const cX = panelX + (panelW - cW) / 2
              const cH = 14
              const cY = panelY + panelH * 0.3 + i * 22
              return (
                <rect
                  key={`cutout-${i}`}
                  x={cX} y={cY} width={cW} height={cH}
                  fill="none"
                  stroke="var(--color-brand-blue)" strokeWidth={1.5} strokeDasharray="3 2"
                  rx={1}
                  style={ts}
                />
              )
            })}
          </>
        )}

        {/* Temperature badge */}
        {(isFreeze || isCool) && (
          <g style={ts}>
            <rect
              x={frameX + frameW - 32} y={frameY + 6}
              width={26} height={16}
              fill={isFreeze ? "var(--color-brand-blue)" : "#06B6D4"}
              opacity={0.9} rx={4}
            />
            <text
              x={frameX + frameW - 19} y={frameY + 17.5}
              textAnchor="middle" fontSize={10} fill="white"
            >
              {isFreeze ? "❄" : "🌡"}
            </text>
          </g>
        )}

        {/* Width dimension line */}
        <line x1={panelX} y1={frameY - 10} x2={panelX + panelW} y2={frameY - 10} stroke="var(--color-brand-blue)" strokeWidth={0.75} />
        <line x1={panelX} y1={frameY - 15} x2={panelX} y2={frameY - 5} stroke="var(--color-brand-blue)" strokeWidth={0.75} />
        <line x1={panelX + panelW} y1={frameY - 15} x2={panelX + panelW} y2={frameY - 5} stroke="var(--color-brand-blue)" strokeWidth={0.75} />
        <text
          x={panelX + panelW / 2} y={frameY - 16}
          textAnchor="middle" fontSize={10} fontWeight={600}
          fill="var(--color-brand-blue)" fontFamily="var(--font-display)"
        >
          {specs.widthInClear ? `${specs.widthInClear}"` : "W"}
        </text>

        {/* Height dimension line */}
        <line x1={frameX - 10} y1={panelY} x2={frameX - 10} y2={panelY + panelH} stroke="var(--color-brand-blue)" strokeWidth={0.75} />
        <line x1={frameX - 15} y1={panelY} x2={frameX - 5} y2={panelY} stroke="var(--color-brand-blue)" strokeWidth={0.75} />
        <line x1={frameX - 15} y1={panelY + panelH} x2={frameX - 5} y2={panelY + panelH} stroke="var(--color-brand-blue)" strokeWidth={0.75} />
        <text
          x={frameX - 18} y={panelY + panelH / 2}
          textAnchor="middle" fontSize={10} fontWeight={600}
          fill="var(--color-brand-blue)" fontFamily="var(--font-display)"
          transform={`rotate(-90 ${frameX - 18} ${panelY + panelH / 2})`}
        >
          {specs.heightInClear ? `${specs.heightInClear}"` : "H"}
        </text>

        {/* Door type label */}
        <text
          x={svgW / 2} y={svgH - 6}
          textAnchor="middle" fontSize={9} fontWeight={500}
          fill="var(--color-text-muted)" fontFamily="var(--font-sans)"
        >
          {isSlider ? "Sliding Door" : "Swing Door"}
          {specs.finish ? ` · ${specs.finish}` : ""}
        </text>
      </svg>
    </div>
  )
}
