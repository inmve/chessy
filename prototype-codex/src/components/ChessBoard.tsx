import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { MoveAnalysis } from '../types/analysis'
import styles from '../App.module.css'

interface ChessBoardProps {
  fen: string
  bestMoves: MoveAnalysis[]
  userMove: MoveAnalysis
  onArbitraryMove: (from: string, to: string) => boolean
  onArrowMove?: (move: MoveAnalysis) => void
  showAlternatives?: boolean
  allowDragging?: boolean
}

export function ChessBoard({
  fen,
  bestMoves,
  userMove,
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

  const [alt1, alt2] = bestMoves
  const arrows = useMemo(() => {
    const items: { startSquare: string; endSquare: string; color: string }[] = []
    
    // Prototype-52 colors:
    // Best: rgba(34, 197, 94, 0.85)
    // Alt: rgba(74, 222, 128, 0.85)
    // User: rgba(249, 115, 22, 0.85)

    if (showAlternatives && alt2 && (alt2.from !== userMove.from || alt2.to !== userMove.to)) {
      items.push({
        startSquare: alt2.from,
        endSquare: alt2.to,
        color: 'rgba(74, 222, 128, 0.85)',
      })
    }
    if (showAlternatives && alt1 && (alt1.from !== userMove.from || alt1.to !== userMove.to)) {
      items.push({
        startSquare: alt1.from,
        endSquare: alt1.to,
        color: 'rgba(34, 197, 94, 0.85)',
      })
    }
    
    if (userMove && userMove.from !== userMove.to) {
      items.push({
        startSquare: userMove.from,
        endSquare: userMove.to,
        color: 'rgba(249, 115, 22, 0.85)',
      })
    }

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
          arrows,
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
    </div>
  )
}
