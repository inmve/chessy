import { useState } from 'react'
import type { MoveAnalysis, PositionAnalysis } from '../types/analysis'
import styles from '../App.module.css'

interface ExplanationPanelProps {
  analysis: PositionAnalysis
  moveNumber: number
  onSelectMove: (move: MoveAnalysis) => void
}

export function ExplanationPanel({ analysis, moveNumber, onSelectMove }: ExplanationPanelProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const toggle = (rank: number) => {
    setExpanded((prev) => ({ ...prev, [rank]: !prev[rank] }))
  }

  const keyForMove = (m: MoveAnalysis) => `${m.from}-${m.to}-${m.rank}`

  const featured = [analysis.bestMoves[0], analysis.bestMoves[1], analysis.userMove].filter(
    Boolean,
  ) as MoveAnalysis[]

  const featuredKeys = new Set(featured.map((m) => keyForMove(m)))
  const remaining = analysis.moves.filter((m) => !featuredKeys.has(keyForMove(m)))

  return (
    <div className={styles.explanationPanel}>
      <div className={styles.explanationHeader}>
        <div className={styles.explanationTitle}>
          Move {moveNumber} – {analysis.playerToMove} to move
        </div>
        <div className={styles.explanationSubtitle}>Tap a line to explore</div>
      </div>
      <div className={styles.explanations}>
        {featured.map((move) => (
          <div
            key={keyForMove(move)}
            className={`${styles.explanationCard} ${
              move.rank === analysis.userMove.rank ? styles.userMoveCard : ''
            }`}
            onClick={() => onSelectMove(move)}
            role="button"
          >
            <div className={styles.explanationHead}>
              <div className={styles.rank}>#{move.rank}</div>
              <div className={styles.notation}>{move.notation}</div>
              <div className={styles.eval}>{move.evaluation.toFixed(2)}</div>
            </div>
            <div className={styles.explanationBody}>{move.explanation}</div>
          </div>
        ))}
        {remaining.map((move) => {
          const isOpen = expanded[move.rank]
          return (
            <div
              key={keyForMove(move)}
              className={styles.explanationRow}
              onClick={() => onSelectMove(move)}
              role="button"
            >
              <div className={styles.rowHead} onClick={(e) => e.stopPropagation()}>
                <div className={styles.rank}>#{move.rank}</div>
                <div className={styles.notation}>{move.notation}</div>
                <button className={styles.expand} onClick={() => toggle(move.rank)}>
                  {isOpen ? 'Hide' : 'Explain'}
                </button>
              </div>
              {isOpen && <div className={styles.rowBody}>{move.explanation}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
