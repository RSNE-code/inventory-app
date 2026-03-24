"use client"

import type { DoorSpecs } from "@/lib/door-specs"
import { DoorPreview } from "./door-preview"

interface DoorDiagramContextualProps {
  step: string // BuilderStep value
  specs: Partial<DoorSpecs>
  className?: string
}

// ── Shared constants ──────────────────────────────────────────────────────────
const SVG_W = 240
const SVG_H = 300
const PAD = 36
const FRAME_X = PAD + 20
const FRAME_Y = PAD
const FRAME_W = SVG_W - FRAME_X - PAD
const FRAME_H = SVG_H - PAD - 30

const TRANSITION: React.CSSProperties = {
  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
}

const GRID_BG: React.CSSProperties = {
  background:
    "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(11,29,58,0.03) 19px, rgba(11,29,58,0.03) 20px), " +
    "repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(11,29,58,0.03) 19px, rgba(11,29,58,0.03) 20px)",
  borderRadius: 12,
  padding: 4,
}

// ── Helper SVG primitives ─────────────────────────────────────────────────────

/** Solid brand-orange dot used as a measurement anchor */
function MeasureDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--color-brand-orange)"
      style={TRANSITION}
    />
  )
}

/** Horizontal double-ended arrow with flat bars at each end */
function HorizontalArrow({
  x1,
  x2,
  y,
  barHeight = 8,
}: {
  x1: number
  x2: number
  y: number
  barHeight?: number
}) {
  const halfBar = barHeight / 2
  return (
    <g style={TRANSITION}>
      {/* Main line */}
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
        style={TRANSITION}
      />
      {/* Left arrowhead */}
      <polygon
        points={`${x1},${y} ${x1 + 6},${y - 3} ${x1 + 6},${y + 3}`}
        fill="var(--color-brand-blue)"
        style={TRANSITION}
      />
      {/* Right arrowhead */}
      <polygon
        points={`${x2},${y} ${x2 - 6},${y - 3} ${x2 - 6},${y + 3}`}
        fill="var(--color-brand-blue)"
        style={TRANSITION}
      />
      {/* Left flat bar (vertical) */}
      <line
        x1={x1}
        y1={y - halfBar}
        x2={x1}
        y2={y + halfBar}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
        style={TRANSITION}
      />
      {/* Right flat bar (vertical) */}
      <line
        x1={x2}
        y1={y - halfBar}
        x2={x2}
        y2={y + halfBar}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
        style={TRANSITION}
      />
    </g>
  )
}

/** Vertical double-ended arrow with flat bars at each end */
function VerticalArrow({
  x,
  y1,
  y2,
  barWidth = 8,
}: {
  x: number
  y1: number
  y2: number
  barWidth?: number
}) {
  const halfBar = barWidth / 2
  return (
    <g style={TRANSITION}>
      {/* Main line */}
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
        style={TRANSITION}
      />
      {/* Top arrowhead */}
      <polygon
        points={`${x},${y1} ${x - 3},${y1 + 6} ${x + 3},${y1 + 6}`}
        fill="var(--color-brand-blue)"
        style={TRANSITION}
      />
      {/* Bottom arrowhead */}
      <polygon
        points={`${x},${y2} ${x - 3},${y2 - 6} ${x + 3},${y2 - 6}`}
        fill="var(--color-brand-blue)"
        style={TRANSITION}
      />
      {/* Top flat bar (horizontal) */}
      <line
        x1={x - halfBar}
        y1={y1}
        x2={x + halfBar}
        y2={y1}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
        style={TRANSITION}
      />
      {/* Bottom flat bar (horizontal) */}
      <line
        x1={x - halfBar}
        y1={y2}
        x2={x + halfBar}
        y2={y2}
        stroke="var(--color-brand-blue)"
        strokeWidth={1.5}
        style={TRANSITION}
      />
    </g>
  )
}

/** Dimension label text — blue, semi-bold, small */
function DimensionLabel({
  x,
  y,
  text,
  rotate,
}: {
  x: number
  y: number
  text: string
  rotate?: number
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
      fill="var(--color-brand-blue)"
      fontFamily="var(--font-display)"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      style={TRANSITION}
    >
      {text}
    </text>
  )
}

/** Door frame outline — used in most step diagrams */
function FrameOutline() {
  return (
    <>
      <rect
        x={FRAME_X}
        y={FRAME_Y}
        width={FRAME_W}
        height={FRAME_H}
        fill="none"
        stroke="var(--color-navy)"
        strokeWidth={2}
        rx={3}
        style={TRANSITION}
      />
      {/* Floor line */}
      <line
        x1={FRAME_X - 12}
        y1={FRAME_Y + FRAME_H}
        x2={FRAME_X + FRAME_W + 12}
        y2={FRAME_Y + FRAME_H}
        stroke="var(--color-navy)"
        strokeWidth={1.5}
        opacity={0.25}
        style={TRANSITION}
      />
    </>
  )
}

// ── Step visualizations ───────────────────────────────────────────────────────

function SwingWidthDiagram({ specs }: { specs: Partial<DoorSpecs> }) {
  const innerLeft = FRAME_X + 8
  const innerRight = FRAME_X + FRAME_W - 8
  const midY = FRAME_Y + FRAME_H / 2

  return (
    <>
      <FrameOutline />
      {/* Opening fill */}
      <rect
        x={FRAME_X + 2}
        y={FRAME_Y + 2}
        width={FRAME_W - 4}
        height={FRAME_H - 4}
        fill="var(--color-surface-secondary)"
        rx={2}
        style={TRANSITION}
      />
      <FrameOutline />

      {/* Measurement dots on inner edges */}
      <MeasureDot cx={innerLeft} cy={midY} />
      <MeasureDot cx={innerRight} cy={midY} />

      {/* Horizontal arrow */}
      <HorizontalArrow x1={innerLeft} x2={innerRight} y={midY} />

      {/* Dimension label */}
      <DimensionLabel
        x={(innerLeft + innerRight) / 2}
        y={midY - 14}
        text={specs.widthInClear ? `${specs.widthInClear}"` : "Width"}
      />
    </>
  )
}

function SwingHeightDiagram({ specs }: { specs: Partial<DoorSpecs> }) {
  const innerTop = FRAME_Y + 8
  const innerBottom = FRAME_Y + FRAME_H - 8
  const leftEdgeX = FRAME_X + 8

  return (
    <>
      <FrameOutline />
      {/* Opening fill */}
      <rect
        x={FRAME_X + 2}
        y={FRAME_Y + 2}
        width={FRAME_W - 4}
        height={FRAME_H - 4}
        fill="var(--color-surface-secondary)"
        rx={2}
        style={TRANSITION}
      />
      <FrameOutline />

      {/* Measurement dots on top and bottom */}
      <MeasureDot cx={leftEdgeX} cy={innerTop} />
      <MeasureDot cx={leftEdgeX} cy={innerBottom} />

      {/* Vertical arrow */}
      <VerticalArrow x={leftEdgeX} y1={innerTop} y2={innerBottom} />

      {/* Dimension label */}
      <DimensionLabel
        x={leftEdgeX - 18}
        y={(innerTop + innerBottom) / 2}
        text={specs.heightInClear ? `${specs.heightInClear}"` : "Height"}
        rotate={-90}
      />
    </>
  )
}

function SwingJambDiagram({ specs }: { specs: Partial<DoorSpecs> }) {
  // 3D perspective diagram — the "wow factor" step
  const jambStripW = 20
  const jambStripX = FRAME_X
  const jambStripY = FRAME_Y
  const arrowY = FRAME_Y + FRAME_H / 2

  return (
    <div
      className="flex items-center justify-center"
      style={{ perspective: "800px" }}
    >
      <div
        style={{
          transform: "rotateY(-20deg) rotateX(5deg)",
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", maxWidth: 220, display: "block", margin: "0 auto" }}
        >
          {/* Blueprint grid */}
          <defs>
            <pattern id="jambGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(11,29,58,0.03)" strokeWidth="1" />
              <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(11,29,58,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#jambGrid)" rx={8} />

          {/* Frame outline */}
          <rect
            x={FRAME_X}
            y={FRAME_Y}
            width={FRAME_W}
            height={FRAME_H}
            fill="none"
            stroke="var(--color-navy)"
            strokeWidth={2}
            rx={3}
            style={TRANSITION}
          />

          {/* Door panel (slightly recessed) */}
          <rect
            x={FRAME_X + jambStripW + 4}
            y={FRAME_Y + 8}
            width={FRAME_W - jambStripW - 12}
            height={FRAME_H - 16}
            fill="var(--color-surface-secondary)"
            stroke="var(--color-navy)"
            strokeWidth={0.75}
            strokeOpacity={0.3}
            rx={2}
            style={TRANSITION}
          />

          {/* Jamb depth strip — the emphasized measurement area */}
          <rect
            x={jambStripX}
            y={jambStripY}
            width={jambStripW}
            height={FRAME_H}
            fill="var(--color-brand-blue)"
            opacity={0.2}
            rx={2}
            style={TRANSITION}
          />
          <rect
            x={jambStripX}
            y={jambStripY}
            width={jambStripW}
            height={FRAME_H}
            fill="none"
            stroke="var(--color-brand-blue)"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            rx={2}
            style={TRANSITION}
          />

          {/* Horizontal arrow across jamb strip */}
          <HorizontalArrow
            x1={jambStripX + 2}
            x2={jambStripX + jambStripW - 2}
            y={arrowY}
            barHeight={6}
          />

          {/* Dimension label */}
          <DimensionLabel
            x={jambStripX + jambStripW / 2}
            y={arrowY - 14}
            text={specs.jambDepth ? `${specs.jambDepth}"` : "Jamb Depth"}
          />

          {/* Floor line */}
          <line
            x1={FRAME_X - 12}
            y1={FRAME_Y + FRAME_H}
            x2={FRAME_X + FRAME_W + 12}
            y2={FRAME_Y + FRAME_H}
            stroke="var(--color-navy)"
            strokeWidth={1.5}
            opacity={0.25}
            style={TRANSITION}
          />

          {/* "Wall thickness" annotation */}
          <text
            x={jambStripX + jambStripW / 2}
            y={FRAME_Y + FRAME_H + 16}
            textAnchor="middle"
            fontSize={8}
            fill="var(--color-text-muted)"
            fontFamily="var(--font-sans)"
            style={TRANSITION}
          >
            Wall / Jamb
          </text>
        </svg>
      </div>
    </div>
  )
}

function SwingFrameDiagram({ specs }: { specs: Partial<DoorSpecs> }) {
  const frameThick = specs.frameType === "FACE_FRAME" ? 12
    : specs.frameType === "BALLY_TYPE" ? 18
    : 14 // FULL_FRAME default — scaled up for visibility

  return (
    <>
      {/* Outer frame rect */}
      <rect
        x={FRAME_X}
        y={FRAME_Y}
        width={FRAME_W}
        height={FRAME_H}
        fill="var(--color-navy)"
        opacity={0.1}
        rx={3}
        style={TRANSITION}
      />
      <rect
        x={FRAME_X}
        y={FRAME_Y}
        width={FRAME_W}
        height={FRAME_H}
        fill="none"
        stroke="var(--color-navy)"
        strokeWidth={2}
        rx={3}
        style={TRANSITION}
      />

      {/* Inner opening — clear/white */}
      <rect
        x={FRAME_X + frameThick}
        y={FRAME_Y + frameThick}
        width={FRAME_W - frameThick * 2}
        height={FRAME_H - frameThick * 2}
        fill="white"
        stroke="var(--color-navy)"
        strokeWidth={0.75}
        strokeOpacity={0.4}
        rx={2}
        style={TRANSITION}
      />

      {/* Frame material overlay — semi-transparent to show frame edges */}
      {/* Top bar */}
      <rect
        x={FRAME_X}
        y={FRAME_Y}
        width={FRAME_W}
        height={frameThick}
        fill="var(--color-navy)"
        opacity={0.08}
        rx={2}
        style={TRANSITION}
      />
      {/* Left bar */}
      <rect
        x={FRAME_X}
        y={FRAME_Y}
        width={frameThick}
        height={FRAME_H}
        fill="var(--color-navy)"
        opacity={0.08}
        rx={2}
        style={TRANSITION}
      />
      {/* Right bar */}
      <rect
        x={FRAME_X + FRAME_W - frameThick}
        y={FRAME_Y}
        width={frameThick}
        height={FRAME_H}
        fill="var(--color-navy)"
        opacity={0.08}
        rx={2}
        style={TRANSITION}
      />

      {/* Frame labels — "Top", "LHS", "RHS" */}
      <text
        x={FRAME_X + FRAME_W / 2}
        y={FRAME_Y + frameThick / 2 + 3}
        textAnchor="middle"
        fontSize={8}
        fontWeight={600}
        fill="var(--color-text-muted)"
        fontFamily="var(--font-sans)"
        style={TRANSITION}
      >
        Top
      </text>
      <text
        x={FRAME_X + frameThick / 2}
        y={FRAME_Y + FRAME_H / 2}
        textAnchor="middle"
        fontSize={8}
        fontWeight={600}
        fill="var(--color-text-muted)"
        fontFamily="var(--font-sans)"
        transform={`rotate(-90 ${FRAME_X + frameThick / 2} ${FRAME_Y + FRAME_H / 2})`}
        style={TRANSITION}
      >
        LHS
      </text>
      <text
        x={FRAME_X + FRAME_W - frameThick / 2}
        y={FRAME_Y + FRAME_H / 2}
        textAnchor="middle"
        fontSize={8}
        fontWeight={600}
        fill="var(--color-text-muted)"
        fontFamily="var(--font-sans)"
        transform={`rotate(90 ${FRAME_X + FRAME_W - frameThick / 2} ${FRAME_Y + FRAME_H / 2})`}
        style={TRANSITION}
      >
        RHS
      </text>

      {/* Subtle dimension: frame width indicator on top bar */}
      <line
        x1={FRAME_X}
        y1={FRAME_Y - 8}
        x2={FRAME_X + frameThick}
        y2={FRAME_Y - 8}
        stroke="var(--color-brand-blue)"
        strokeWidth={0.75}
        style={TRANSITION}
      />
      <line
        x1={FRAME_X}
        y1={FRAME_Y - 12}
        x2={FRAME_X}
        y2={FRAME_Y - 4}
        stroke="var(--color-brand-blue)"
        strokeWidth={0.75}
        style={TRANSITION}
      />
      <line
        x1={FRAME_X + frameThick}
        y1={FRAME_Y - 12}
        x2={FRAME_X + frameThick}
        y2={FRAME_Y - 4}
        stroke="var(--color-brand-blue)"
        strokeWidth={0.75}
        style={TRANSITION}
      />
      <DimensionLabel
        x={FRAME_X + frameThick / 2}
        y={FRAME_Y - 16}
        text={
          specs.frameType === "FACE_FRAME" ? "Face"
            : specs.frameType === "BALLY_TYPE" ? "Bally"
            : "Full"
        }
      />

      {/* Floor line */}
      <line
        x1={FRAME_X - 12}
        y1={FRAME_Y + FRAME_H}
        x2={FRAME_X + FRAME_W + 12}
        y2={FRAME_Y + FRAME_H}
        stroke="var(--color-navy)"
        strokeWidth={1.5}
        opacity={0.25}
        style={TRANSITION}
      />
    </>
  )
}

function SwingCutoutsDiagram({ specs }: { specs: Partial<DoorSpecs> }) {
  const frameThick = 10
  const hasCutouts = specs.cutouts && specs.cutouts.length > 0

  // Frame inner edge X — cutouts are on the LEFT frame edge
  const frameLeftOuter = FRAME_X
  const floorY = FRAME_Y + FRAME_H // floor level
  const frameInnerH = FRAME_H // total frame height represents full door height

  // Parse a dimension string to a number (inches)
  function parseInches(val: string): number {
    const cleaned = val.replace(/["\s]/g, "")
    const n = parseFloat(cleaned)
    return isNaN(n) ? 0 : n
  }

  // We need a scale factor: map real inches → SVG pixels
  // Assume a typical door height of ~84" for scaling
  const doorHeightInches = specs.heightInClear
    ? parseInches(specs.heightInClear)
    : 84
  const scale = doorHeightInches > 0 ? frameInnerH / doorHeightInches : 1

  return (
    <>
      {/* Frame outline */}
      <rect
        x={FRAME_X}
        y={FRAME_Y}
        width={FRAME_W}
        height={FRAME_H}
        fill="none"
        stroke="var(--color-navy)"
        strokeWidth={2}
        rx={3}
        style={TRANSITION}
      />

      {/* Inner opening */}
      <rect
        x={FRAME_X + frameThick}
        y={FRAME_Y + frameThick}
        width={FRAME_W - frameThick * 2}
        height={FRAME_H - frameThick * 2}
        fill="var(--color-surface-secondary)"
        rx={2}
        style={TRANSITION}
      />

      {/* Left frame edge strip — where cutouts go */}
      <rect
        x={frameLeftOuter}
        y={FRAME_Y}
        width={frameThick}
        height={FRAME_H}
        fill="var(--color-navy)"
        opacity={0.08}
        style={TRANSITION}
      />

      {hasCutouts ? (
        specs.cutouts!.map((cutout, i) => {
          const floorToBottom = parseInches(cutout.floorToBottom || "0")
          const floorToTop = parseInches(cutout.floorToTop || "0")
          const cutoutFrameWidth = parseInches(cutout.frameWidth || "0")

          // Convert to SVG Y (floor is at bottom, so we go upward)
          const svgBottomY = floorY - floorToBottom * scale
          const svgTopY = floorY - floorToTop * scale
          const cutoutH = svgBottomY - svgTopY
          const cutoutW = Math.max(cutoutFrameWidth * scale * 0.5, 16) // Scale width, min 16px

          return (
            <g key={`cutout-${i}`} style={TRANSITION}>
              {/* Cutout notch on the left frame edge */}
              <rect
                x={frameLeftOuter}
                y={svgTopY}
                width={Math.min(cutoutW, frameThick + 20)}
                height={Math.max(cutoutH, 8)}
                fill="var(--color-brand-blue)"
                opacity={0.15}
                stroke="var(--color-brand-blue)"
                strokeWidth={1}
                strokeDasharray="4 2"
                rx={1}
                style={TRANSITION}
              />

              {/* Vertical measurement: floor to bottom of cutout */}
              <VerticalArrow
                x={FRAME_X - 14}
                y1={svgBottomY}
                y2={floorY}
                barWidth={6}
              />
              <DimensionLabel
                x={FRAME_X - 28}
                y={(svgBottomY + floorY) / 2}
                text={cutout.floorToBottom ? `${cutout.floorToBottom}"` : "?"}
                rotate={-90}
              />

              {/* Vertical measurement: floor to top of cutout */}
              <VerticalArrow
                x={FRAME_X + FRAME_W + 14}
                y1={svgTopY}
                y2={floorY}
                barWidth={6}
              />
              <DimensionLabel
                x={FRAME_X + FRAME_W + 28}
                y={(svgTopY + floorY) / 2}
                text={cutout.floorToTop ? `${cutout.floorToTop}"` : "?"}
                rotate={-90}
              />

              {/* Horizontal measurement: width from frame edge */}
              {cutoutFrameWidth > 0 && (
                <>
                  <HorizontalArrow
                    x1={frameLeftOuter}
                    x2={frameLeftOuter + Math.min(cutoutW, frameThick + 20)}
                    y={svgTopY - 8}
                    barHeight={5}
                  />
                  <DimensionLabel
                    x={frameLeftOuter + Math.min(cutoutW, frameThick + 20) / 2}
                    y={svgTopY - 16}
                    text={`${cutout.frameWidth}"`}
                  />
                </>
              )}
            </g>
          )
        })
      ) : (
        /* No cutouts yet — show placeholder dashed outline with "+" indicator */
        <g style={TRANSITION}>
          <rect
            x={frameLeftOuter}
            y={FRAME_Y + FRAME_H * 0.3}
            width={frameThick + 12}
            height={FRAME_H * 0.2}
            fill="none"
            stroke="var(--color-brand-blue)"
            strokeWidth={1}
            strokeDasharray="4 3"
            strokeOpacity={0.4}
            rx={2}
            style={TRANSITION}
          />
          {/* Plus icon */}
          <line
            x1={frameLeftOuter + (frameThick + 12) / 2}
            y1={FRAME_Y + FRAME_H * 0.37}
            x2={frameLeftOuter + (frameThick + 12) / 2}
            y2={FRAME_Y + FRAME_H * 0.43}
            stroke="var(--color-brand-blue)"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            style={TRANSITION}
          />
          <line
            x1={frameLeftOuter + (frameThick + 12) / 2 - 4}
            y1={FRAME_Y + FRAME_H * 0.4}
            x2={frameLeftOuter + (frameThick + 12) / 2 + 4}
            y2={FRAME_Y + FRAME_H * 0.4}
            stroke="var(--color-brand-blue)"
            strokeWidth={1.5}
            strokeOpacity={0.5}
            style={TRANSITION}
          />
          <text
            x={frameLeftOuter + (frameThick + 12) / 2}
            y={FRAME_Y + FRAME_H * 0.52}
            textAnchor="middle"
            fontSize={7}
            fill="var(--color-text-muted)"
            fontFamily="var(--font-sans)"
            style={TRANSITION}
          >
            Cutout
          </text>
        </g>
      )}

      {/* Floor line */}
      <line
        x1={FRAME_X - 12}
        y1={floorY}
        x2={FRAME_X + FRAME_W + 12}
        y2={floorY}
        stroke="var(--color-navy)"
        strokeWidth={1.5}
        opacity={0.25}
        style={TRANSITION}
      />
      <text
        x={FRAME_X + FRAME_W / 2}
        y={floorY + 14}
        textAnchor="middle"
        fontSize={8}
        fill="var(--color-text-muted)"
        fontFamily="var(--font-sans)"
        style={TRANSITION}
      >
        Floor
      </text>
    </>
  )
}

function SwingHingeDiagram({ specs }: { specs: Partial<DoorSpecs> }) {
  const frameThick = 8
  const panelX = FRAME_X + frameThick
  const panelY = FRAME_Y + frameThick
  const panelW = FRAME_W - frameThick * 2
  const panelH = FRAME_H - frameThick * 2

  const hingeOnLeft = specs.hingeSide === "LEFT"
  const hingeX = hingeOnLeft ? panelX + 2 : panelX + panelW - 2
  const handleX = hingeOnLeft ? panelX + panelW - 6 : panelX + 6

  // Hinge positions — 3 evenly spaced
  const hingeCount = 3
  const hingePositions = Array.from({ length: hingeCount }, (_, i) => {
    const spacing = panelH / (hingeCount + 1)
    return panelY + spacing * (i + 1)
  })

  // Swing arc parameters
  const arcRadius = panelW * 0.85
  const arcCenterX = hingeOnLeft ? panelX : panelX + panelW
  const arcCenterY = panelY + panelH
  const arcStartAngle = hingeOnLeft ? -90 : -90
  const arcEndAngle = hingeOnLeft ? 0 : -180

  // Calculate arc path
  const startRad = (arcStartAngle * Math.PI) / 180
  const endRad = (arcEndAngle * Math.PI) / 180
  const arcStartX = arcCenterX + arcRadius * Math.cos(startRad)
  const arcStartY = arcCenterY + arcRadius * Math.sin(startRad)
  const arcEndX = arcCenterX + arcRadius * Math.cos(endRad)
  const arcEndY = arcCenterY + arcRadius * Math.sin(endRad)
  const sweepFlag = hingeOnLeft ? 1 : 0

  return (
    <>
      {/* Frame outline */}
      <FrameOutline />

      {/* Door panel */}
      <rect
        x={panelX}
        y={panelY}
        width={panelW}
        height={panelH}
        fill="var(--color-surface-secondary)"
        stroke="var(--color-navy)"
        strokeWidth={1}
        strokeOpacity={0.3}
        rx={2}
        style={TRANSITION}
      />

      {/* Hinges — rounded rect plates with pin circles */}
      {hingePositions.map((cy, i) => (
        <g key={`hinge-${i}`} style={TRANSITION}>
          {/* Hinge plate */}
          <rect
            x={hingeOnLeft ? hingeX - 5 : hingeX - 5}
            y={cy - 3}
            width={10}
            height={6}
            fill="var(--color-navy)"
            opacity={0.7}
            rx={1.5}
            style={TRANSITION}
          />
          {/* Pin circle */}
          <circle
            cx={hingeX}
            cy={cy}
            r={2}
            fill="var(--color-navy)"
            opacity={0.9}
            style={TRANSITION}
          />
        </g>
      ))}

      {/* Handle — rounded rectangle on opposite side */}
      <rect
        x={handleX - 2}
        y={panelY + panelH * 0.4}
        width={4}
        height={12}
        fill="var(--color-brand-orange)"
        rx={2}
        style={TRANSITION}
      />

      {/* Swing arc — dashed curved line showing door movement */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke="var(--color-brand-blue)"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.4}
        style={TRANSITION}
      />

      {/* Labels */}
      <text
        x={hingeX}
        y={FRAME_Y + FRAME_H + 16}
        textAnchor="middle"
        fontSize={8}
        fontWeight={600}
        fill="var(--color-text-muted)"
        fontFamily="var(--font-sans)"
        style={TRANSITION}
      >
        {specs.hingeSide === "LEFT" ? "Left Hinge" : "Right Hinge"}
      </text>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DoorDiagramContextual({
  step,
  specs,
  className,
}: DoorDiagramContextualProps) {
  // SWING_JAMB uses its own wrapper with perspective, so handle it separately
  if (step === "SWING_JAMB") {
    return (
      <div className={className} style={GRID_BG}>
        <SwingJambDiagram specs={specs} />
      </div>
    )
  }

  // Steps that use the standard SVG wrapper
  const standardSteps = [
    "SWING_WIDTH",
    "SWING_HEIGHT",
    "SWING_FRAME",
    "SWING_FRAME_CUSTOM",
    "SWING_CUTOUTS",
    "SWING_CUTOUT_DETAIL",
    "SWING_HINGE",
  ]

  if (standardSteps.includes(step)) {
    return (
      <div className={className} style={GRID_BG}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", maxWidth: 220, display: "block", margin: "0 auto" }}
        >
          {/* Blueprint grid background */}
          <defs>
            <pattern
              id="ctxGrid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="20"
                y2="0"
                stroke="rgba(11,29,58,0.03)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="20"
                stroke="rgba(11,29,58,0.03)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#ctxGrid)" rx={8} />

          {step === "SWING_WIDTH" && <SwingWidthDiagram specs={specs} />}
          {step === "SWING_HEIGHT" && <SwingHeightDiagram specs={specs} />}
          {(step === "SWING_FRAME" || step === "SWING_FRAME_CUSTOM") && (
            <SwingFrameDiagram specs={specs} />
          )}
          {(step === "SWING_CUTOUTS" || step === "SWING_CUTOUT_DETAIL") && (
            <SwingCutoutsDiagram specs={specs} />
          )}
          {step === "SWING_HINGE" && <SwingHingeDiagram specs={specs} />}
        </svg>
      </div>
    )
  }

  // Fallback: all other steps use DoorPreview
  return <DoorPreview specs={specs} className={className} />
}
