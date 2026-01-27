import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { MoveAnalysis } from '../types/analysis'
import styles from '../App.module.css'

const formatEval = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`

type ArrowMove = {
  move: MoveAnalysis
  color: string
  key: string
  kind: 'alt1' | 'alt2' | 'alt3' | 'alt4' | 'alt5' | 'user'
}
type ArrowLabel = { x: number; y: number; text: string; key: string }
type ArrowPath = { d: string; color: string; markerId: string; key: string; width: number }

interface ChessBoardProps {
  fen: string
  bestMoves: MoveAnalysis[]
  userMove: MoveAnalysis
  highlightedMove?: { from: string; to: string } | null
  onArbitraryMove: (from: string, to: string) => boolean
  onArrowMove?: (move: MoveAnalysis) => void
  showAlternatives?: boolean
  allowDragging?: boolean
}

export function ChessBoard({
  fen,
  bestMoves,
  userMove,
  highlightedMove = null,
  onArbitraryMove,
  showAlternatives = true,
  allowDragging = true,
}: ChessBoardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(360)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const updateSize = () => {
      const parentWidth =
        el.parentElement?.getBoundingClientRect().width ?? el.getBoundingClientRect().width
      if (!parentWidth) return
      setBoardWidth(Math.min(720, parentWidth))
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const altMoves = bestMoves.slice(0, 5)
  const neutralArrowColor = 'rgba(148, 163, 184, 0.5)'
  const userArrowColor = 'rgba(148, 163, 184, 1)'
  const userHighlightColor = 'rgba(59, 130, 246, 0.9)'
  const arrowMoves = useMemo<ArrowMove[]>(() => {
    const items: ArrowMove[] = []
    
    // Prototype-52 colors:
    // Best: rgba(34, 197, 94, 0.85)
    // Alt: rgba(74, 222, 128, 0.85)
    // User: rgba(249, 115, 22, 0.85)

    if (showAlternatives) {
      altMoves.forEach((move, index) => {
        if (move.from === userMove.from && move.to === userMove.to) return
        items.push({
          move,
          color: neutralArrowColor,
          key: `alt-${move.from}-${move.to}-${index}`,
          kind: `alt${index + 1}` as ArrowMove['kind'],
        })
      })
    }
    
    if (userMove && userMove.from !== userMove.to) {
      items.push({
        move: userMove,
        color: userArrowColor,
        key: `user-${userMove.from}-${userMove.to}`,
        kind: 'user',
      })
    }

    return items
  }, [altMoves, neutralArrowColor, showAlternatives, userArrowColor, userMove])
  const arrowPaths = useMemo<ArrowPath[]>(() => {
    if (!boardWidth || arrowMoves.length === 0) return []
    const squareSize = boardWidth / 8
    const strokeWidth = Math.max(2.5, squareSize * 0.12)

    const squareCenter = (square: string) => {
      if (square.length < 2) return null
      const file = square.charCodeAt(0) - 97
      const rank = Number.parseInt(square[1], 10) - 1
      if (Number.isNaN(file) || Number.isNaN(rank)) return null
      if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
      return {
        x: (file + 0.5) * squareSize,
        y: (7 - rank + 0.5) * squareSize,
      }
    }

    const buildPath = (
      start: { x: number; y: number },
      end: { x: number; y: number },
    ) => {
      const dxSquares = Math.round((end.x - start.x) / squareSize)
      const dySquares = Math.round((end.y - start.y) / squareSize)
      const absDx = Math.abs(dxSquares)
      const absDy = Math.abs(dySquares)
      const isKnight =
        (absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1)

      if (isKnight) {
        const horizontalFirst = absDx > absDy
        const mid = horizontalFirst
          ? { x: start.x + dxSquares * squareSize, y: start.y }
          : { x: start.x, y: start.y + dySquares * squareSize }
        return `M ${start.x} ${start.y} L ${mid.x} ${mid.y} L ${end.x} ${end.y}`
      }

      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    }

    return arrowMoves
      .map((item) => {
        const start = squareCenter(item.move.from)
        const end = squareCenter(item.move.to)
        if (!start || !end) return null
        const path = buildPath(start, end)
        return {
          d: path,
          color: item.color,
          markerId: item.kind === 'user' ? 'arrowhead-user' : 'arrowhead-alt',
          key: item.key,
          width: strokeWidth,
        }
      })
      .filter((item): item is ArrowPath => item !== null)
  }, [arrowMoves, boardWidth])
  const arrowLabels = useMemo<ArrowLabel[]>(() => {
    if (!boardWidth) return []
    const squareSize = boardWidth / 8
    const halfSquare = squareSize / 2
    const clamp = (value: number) => Math.min(boardWidth - halfSquare, Math.max(halfSquare, value))
    const squareCenter = (square: string) => {
      if (square.length < 2) return null
      const file = square.charCodeAt(0) - 97
      const rank = Number.parseInt(square[1], 10) - 1
      if (Number.isNaN(file) || Number.isNaN(rank)) return null
      if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
      return {
        x: (file + 0.5) * squareSize,
        y: (7 - rank + 0.5) * squareSize,
      }
    }

    return arrowMoves
      .map((item) => {
        const start = squareCenter(item.move.from)
        const end = squareCenter(item.move.to)
        if (!start || !end) return null

        const dx = end.x - start.x
        const dy = end.y - start.y
        const length = Math.hypot(dx, dy) || 1
        const t = 0.72
        const baseX = start.x + dx * t
        const baseY = start.y + dy * t
        const offset = squareSize * 0.18
        const offsetX = (-dy / length) * offset
        const offsetY = (dx / length) * offset

        return {
          x: clamp(baseX + offsetX),
          y: clamp(baseY + offsetY),
          text: formatEval(item.move.evaluation),
          key: `${item.kind}-${item.move.from}-${item.move.to}-${item.move.evaluation}`,
        }
      })
      .filter((label): label is ArrowLabel => label !== null)
  }, [arrowMoves, boardWidth])
  const arrowsKey = useMemo(
    () => arrowPaths.map((arrow) => `${arrow.key}${arrow.color}`).join('|'),
    [arrowPaths],
  )

  return (
    <div
      className={styles.chessboardWrapper}
      ref={wrapperRef}
      style={{ width: `${boardWidth}px`, height: `${boardWidth}px` }}
    >
      <Chessboard
        key={`${fen}-${arrowsKey}`}
        options={{
          position: fen,
          allowDragging,
          allowDrawingArrows: false,
          arrows: [],
          squareStyles:
            highlightedMove && highlightedMove.from !== highlightedMove.to
              ? {
                  [highlightedMove.from]: {
                    boxShadow: `inset 0 0 0 3px ${userHighlightColor}`,
                  },
                  [highlightedMove.to]: {
                    boxShadow: `inset 0 0 0 3px ${userHighlightColor}`,
                  },
                }
              : {},
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!allowDragging) return false
            if (!targetSquare) return false
            return onArbitraryMove(sourceSquare, targetSquare)
          },
          boardStyle: {
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            border: '1px solid #0f172a',
            width: '100%',
            height: '100%',
          },
          darkSquareStyle: { backgroundColor: '#4b5563' },
          lightSquareStyle: { backgroundColor: '#e5e7eb' },
          showNotation: true,
        }}
      />
      <svg
        className={styles.boardArrowLayer}
        width={boardWidth}
        height={boardWidth}
        viewBox={`0 0 ${boardWidth} ${boardWidth}`}
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="arrowhead-alt"
            markerWidth="4"
            markerHeight="4"
            refX="3.2"
            refY="2"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill={neutralArrowColor} />
          </marker>
          <marker
            id="arrowhead-user"
            markerWidth="4"
            markerHeight="4"
            refX="3.2"
            refY="2"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill={userArrowColor} />
          </marker>
        </defs>
        {arrowPaths.map((arrow) => (
          <path
            key={arrow.key}
            d={arrow.d}
            fill="none"
            stroke={arrow.color}
            strokeWidth={arrow.width}
            strokeLinecap="round"
            markerEnd={`url(#${arrow.markerId})`}
          />
        ))}
      </svg>
      <div className={styles.arrowEvalLayer}>
        {arrowLabels.map((label) => (
          <div
            key={label.key}
            className={styles.arrowEvalBadge}
            style={{ left: `${label.x}px`, top: `${label.y}px` }}
          >
            {label.text}
          </div>
        ))}
      </div>
    </div>
  )
}
