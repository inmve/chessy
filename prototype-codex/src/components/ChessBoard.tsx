import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { MoveAnalysis } from '../types/analysis'
import styles from '../App.module.css'

interface ChessBoardProps {
  fen: string
  bestMoves: MoveAnalysis[]
  userMove: MoveAnalysis
  onArbitraryMove: (from: string, to: string) => boolean
  onArrowMove: (move: MoveAnalysis) => void
  showAlternatives?: boolean
  allowDragging?: boolean
}

const boardFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

const squareToPoint = (square: string) => {
  const file = boardFiles.indexOf(square[0])
  const rank = 8 - Number(square[1])
  return { x: file + 0.5, y: rank + 0.5 }
}

export function ChessBoard({
  fen,
  bestMoves,
  userMove,
  onArbitraryMove,
  onArrowMove,
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

  const [alt1, alt2] = bestMoves
  const arrows = useMemo(() => {
    const items: Array<{
      move: MoveAnalysis
      color: string
      dash?: string
      offset: number
      label: string
    }> = []
    if (showAlternatives && alt1 && (alt1.from !== userMove.from || alt1.to !== userMove.to)) {
      items.push({ move: alt1, color: '#22c55e', offset: -0.08, label: 'best' })
    }
    if (showAlternatives && alt2 && (alt2.from !== userMove.from || alt2.to !== userMove.to)) {
      items.push({ move: alt2, color: '#4ade80', dash: '0.25 0.18', offset: 0.08, label: 'alt' })
    }
    items.push({ move: userMove, color: '#f97316', offset: 0, label: 'user' })
    return items
  }, [alt1, alt2, showAlternatives, userMove])

  return (
    <div
      className={styles.chessboardWrapper}
      ref={wrapperRef}
      style={{ width: `${boardWidth}px`, height: `${boardWidth}px` }}
    >
      <Chessboard
        options={{
          position: fen,
          allowDragging,
          allowDrawingArrows: false,
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
      <svg className={styles.arrowLayer} viewBox="0 0 8 8" preserveAspectRatio="none">
        {arrows.map((item, index) => {
          const start = squareToPoint(item.move.from)
          const end = squareToPoint(item.move.to)
          const dx = end.x - start.x
          const dy = end.y - start.y
          const length = Math.max(Math.hypot(dx, dy), 0.001)
          const nx = dx / length
          const ny = dy / length
          const px = -ny
          const py = nx
          const offsetX = px * item.offset
          const offsetY = py * item.offset
          const pad = 0.25
          const x1 = start.x + nx * pad + offsetX
          const y1 = start.y + ny * pad + offsetY
          const x2 = end.x - nx * pad + offsetX
          const y2 = end.y - ny * pad + offsetY
          const markerId = `arrowhead-${item.label}-${index}`

          return (
            <g key={`${item.label}-${item.move.from}-${item.move.to}`}>
              <defs>
                <marker
                  id={markerId}
                  markerWidth="2"
                  markerHeight="2"
                  refX="1"
                  refY="1"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,2 L2,1 z" fill={item.color} />
                </marker>
              </defs>
              {showAlternatives && (
                <line
                  className={styles.arrowHit}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  onClick={() => onArrowMove(item.move)}
                />
              )}
              <line
                className={styles.arrowLine}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={item.color}
                strokeDasharray={item.dash}
                markerEnd={`url(#${markerId})`}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
