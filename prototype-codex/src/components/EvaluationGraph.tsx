import type { MouseEvent } from 'react'
import type { GraphPoint } from '../types/game'
import styles from '../App.module.css'

interface EvaluationGraphProps {
  mainLine: GraphPoint[]
  explorationLine: GraphPoint[]
  currentMove: number
  divergenceAt?: number
  currentMoveLabel?: string
  currentMoveIsOpponent?: boolean
  onSelectMove: (moveNumber: number) => void
}

type LinePoint = { moveNumber: number; evaluation: number }

type ErrorCategory = GraphPoint['category']

const dotFillFor = (color: 'white' | 'black') => (color === 'white' ? '#f8fafc' : '#0b0f19')

const ringConfig = (category: ErrorCategory) => {
  switch (category) {
    case 'inaccuracy':
      return { color: '#facc15', width: 2 }
    case 'mistake':
      return { color: '#f59e0b', width: 3 }
    case 'blunder':
      return { color: '#ef4444', width: 4 }
    default:
      return null
  }
}

const withAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function EvaluationGraph({
  mainLine,
  explorationLine,
  currentMove,
  divergenceAt,
  currentMoveLabel,
  currentMoveIsOpponent = false,
  onSelectMove,
}: EvaluationGraphProps) {
  if (mainLine.length === 0) return null

  const width = 1000
  const height = 220
  const padding = { top: 20, right: 28, bottom: 32, left: 40 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  const allPoints = [...mainLine, ...explorationLine]
  const maxEval = Math.max(2, ...allPoints.map((p) => Math.abs(p.evaluation)))
  const evalRange = maxEval * 2

  const xScale = (moveNumber: number) =>
    padding.left + ((moveNumber - 0.5) / mainLine.length) * graphWidth
  const yScale = (value: number) =>
    padding.top + ((maxEval - value) / evalRange) * graphHeight

  const buildPath = (points: LinePoint[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.moveNumber)} ${yScale(p.evaluation)}`)
      .join(' ')

  const divergenceIndex = divergenceAt ? mainLine.findIndex((p) => p.moveNumber === divergenceAt) : -1
  const mainBefore = divergenceIndex >= 0 ? mainLine.slice(0, divergenceIndex + 1) : mainLine
  const mainAfter = divergenceIndex >= 0 ? mainLine.slice(divergenceIndex) : []
  const divergenceEval = divergenceAt
    ? mainLine.find((p) => p.moveNumber === divergenceAt)?.evaluation ?? null
    : null

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const svgX = (x / rect.width) * width
    const ratio = (svgX - padding.left) / graphWidth
    const idx = Math.round(ratio * mainLine.length - 0.5)
    const clamped = Math.max(0, Math.min(mainLine.length - 1, idx))
    onSelectMove(clamped + 1)
  }

  const explorationPath: LinePoint[] =
    divergenceEval !== null && explorationLine.length > 0
      ? [{ moveNumber: divergenceAt ?? 0, evaluation: divergenceEval }, ...explorationLine]
      : explorationLine

  const baseLineStroke = '#cbd5e1'
  const baseLineWidth = 2
  const baseLineOpacity = 0.45
  const mutedLineOpacity = 0.2
  const explorationLineOpacity = 0.65
  const dotRadius = 5
  const dotStroke = '#94a3b8'
  const dotStrokeWidth = 1.5
  const ringGap = 2
  const culpritWidth = baseLineWidth + 1

  type CulpritSegment = {
    id: string
    x1: number
    y1: number
    x2: number
    y2: number
    color: string
    solid: boolean
    muted: boolean
  }

  const buildCulpritSegments = (
    points: GraphPoint[],
    getPrevPoint: (index: number) => LinePoint | null,
    keyPrefix: string,
    isMuted: (point: GraphPoint) => boolean,
  ): CulpritSegment[] =>
    points.flatMap((point, index) => {
      const ring = ringConfig(point.category)
      if (!ring) return []
      const prev = getPrevPoint(index)
      if (!prev) return []
      const hasPrevError = index > 0 && ringConfig(points[index - 1].category)
      const hasNextError = index < points.length - 1 && ringConfig(points[index + 1].category)
      return [
        {
          id: `${keyPrefix}-${point.moveNumber}`,
          x1: xScale(prev.moveNumber),
          y1: yScale(prev.evaluation),
          x2: xScale(point.moveNumber),
          y2: yScale(point.evaluation),
          color: ring.color,
          solid: Boolean(hasPrevError || hasNextError),
          muted: isMuted(point),
        },
      ]
    })

  const mainSegments = buildCulpritSegments(
    mainLine,
    (index) => (index === 0 ? null : mainLine[index - 1]),
    'main',
    (point) => divergenceAt !== undefined && point.moveNumber > divergenceAt,
  )

  const explorationSegments =
    explorationLine.length > 0
      ? buildCulpritSegments(
          explorationLine,
          (index) =>
            index === 0
              ? divergenceEval !== null
                ? { moveNumber: divergenceAt ?? 0, evaluation: divergenceEval }
                : null
              : explorationLine[index - 1],
          'alt',
          () => false,
        )
      : []

  const culpritSegments = [...mainSegments, ...explorationSegments]

  return (
    <div className={styles.graphCard}>
      {currentMoveLabel && (
        <div
          className={`${styles.graphMoveTag} ${
            currentMoveIsOpponent ? styles.graphMoveOpponent : styles.graphMoveSelf
          }`}
        >
          {currentMoveLabel}
        </div>
      )}
      <svg
        className={styles.graph}
        width="100%"
        height="220"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onClick={handleClick}
      >
        <defs>
          {culpritSegments
            .filter((segment) => !segment.solid)
            .map((segment) => (
              <linearGradient
                key={`grad-${segment.id}`}
                id={`culprit-${segment.id}`}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={withAlpha(segment.color, segment.muted ? 0.02 : 0.05)} />
                <stop
                  offset="100%"
                  stopColor={withAlpha(segment.color, segment.muted ? 0.2 : 0.55)}
                />
              </linearGradient>
            ))}
        </defs>

        <rect x={0} y={0} width={width} height={height} rx={16} fill="#0b1224" />

        <line
          x1={padding.left}
          y1={yScale(0)}
          x2={width - padding.right}
          y2={yScale(0)}
          stroke="#475569"
          strokeWidth={1.5}
          strokeDasharray="6 6"
          opacity={0.35}
        />

        {mainBefore.length > 1 && (
          <path
            d={buildPath(mainBefore)}
            fill="none"
            stroke={baseLineStroke}
            strokeWidth={baseLineWidth}
            strokeLinejoin="round"
            opacity={baseLineOpacity}
          />
        )}
        {mainAfter.length > 1 && (
          <path
            d={buildPath(mainAfter)}
            fill="none"
            stroke={baseLineStroke}
            strokeWidth={baseLineWidth}
            strokeLinejoin="round"
            opacity={mutedLineOpacity}
          />
        )}

        {explorationPath.length > 1 && (
          <path
            d={buildPath(explorationPath)}
            fill="none"
            stroke={baseLineStroke}
            strokeWidth={baseLineWidth}
            strokeLinejoin="round"
            opacity={explorationLineOpacity}
          />
        )}

        {culpritSegments.map((segment) => (
          <line
            key={`culprit-${segment.id}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={
              segment.solid
                ? withAlpha(segment.color, segment.muted ? 0.2 : 0.45)
                : `url(#culprit-${segment.id})`
            }
            strokeWidth={culpritWidth}
            strokeLinecap="round"
          />
        ))}

        <line
          x1={xScale(currentMove)}
          y1={padding.top}
          x2={xScale(currentMove)}
          y2={height - padding.bottom}
          stroke="#64748b"
          strokeWidth={1.5}
          opacity={0.3}
        />

        {mainLine.map((p) => {
          const x = xScale(p.moveNumber)
          const y = yScale(p.evaluation)
          const muted = divergenceAt !== undefined && p.moveNumber > divergenceAt
          const ring = ringConfig(p.category)
          const ringRadius = ring ? dotRadius + ringGap + ring.width / 2 : null
          const dotOpacity = muted ? 0.35 : 0.9
          const strokeOpacity = muted ? 0.35 : 0.7

          return (
            <g key={`main-${p.moveNumber}`}>
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                fill={dotFillFor(p.playerColor)}
                stroke={dotStroke}
                strokeWidth={dotStrokeWidth}
                opacity={dotOpacity}
                strokeOpacity={strokeOpacity}
              />
              {ring && ringRadius && (
                <circle
                  cx={x}
                  cy={y}
                  r={ringRadius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ring.width}
                  opacity={muted ? 0.3 : 0.95}
                />
              )}
            </g>
          )
        })}

        {explorationLine.length > 0 && (
          <>
            {explorationLine.map((p) => {
              const x = xScale(p.moveNumber)
              const y = yScale(p.evaluation)
              const ring = ringConfig(p.category)
              const ringRadius = ring ? dotRadius + ringGap + ring.width / 2 : null

              return (
                <g key={`alt-${p.moveNumber}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={dotRadius}
                    fill={dotFillFor(p.playerColor)}
                    stroke={dotStroke}
                    strokeWidth={dotStrokeWidth}
                    opacity={0.95}
                  />
                  {ring && ringRadius && (
                    <circle
                      cx={x}
                      cy={y}
                      r={ringRadius}
                      fill="none"
                      stroke={ring.color}
                      strokeWidth={ring.width}
                      opacity={0.95}
                    />
                  )}
                </g>
              )
            })}
          </>
        )}

        <text
          x={padding.left - 6}
          y={yScale(maxEval) + 6}
          textAnchor="end"
          fill="#64748b"
          fontSize={11}
        >
          +{maxEval.toFixed(0)}
        </text>
        <text
          x={padding.left - 6}
          y={yScale(0) + 6}
          textAnchor="end"
          fill="#64748b"
          fontSize={11}
        >
          0
        </text>
        <text
          x={padding.left - 6}
          y={yScale(-maxEval) + 6}
          textAnchor="end"
          fill="#64748b"
          fontSize={11}
        >
          -{maxEval.toFixed(0)}
        </text>

        <text
          x={padding.left}
          y={height - 8}
          textAnchor="start"
          fill="#64748b"
          fontSize={10}
          letterSpacing="0.04em"
        >
          1
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          fill="#64748b"
          fontSize={10}
          letterSpacing="0.04em"
        >
          {mainLine.length}
        </text>
      </svg>
    </div>
  )
}
