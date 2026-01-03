import type { MoveAnalysis } from '../types/analysis'
import styles from '../App.module.css'

interface MoveStripProps {
  bestMoves: MoveAnalysis[]
  userMove: MoveAnalysis
  onMoveClick: (move: MoveAnalysis) => void
  showUserMove: boolean
}

const formatEval = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`

export function MoveStrip({ bestMoves, userMove, onMoveClick, showUserMove }: MoveStripProps) {
  const [alt1, alt2] = bestMoves

  const renderMoveCard = (move: MoveAnalysis | undefined, type: 'alt1' | 'alt2' | 'userMove') => {
    if (!move) return null
    if (move.from === move.to) return null // Skip dummy moves

    return (
      <div
        key={`${type}-${move.from}-${move.to}`}
        className={`${styles.moveCard} ${styles[type]}`}
        onClick={() => onMoveClick(move)}
      >
        <div className={styles.moveCardHeader}>
          <span className={styles.moveTitle}>
            {move.rank}. {move.notation}
          </span>
          <span className={styles.moveEval}>{formatEval(move.evaluation)}</span>
        </div>
        <div className={styles.moveExplanation}>{move.explanation}</div>
      </div>
    )
  }

  // Logic to hide alts if they duplicate the user move (same from/to)
  const showAlt1 = alt1 && (alt1.from !== userMove.from || alt1.to !== userMove.to)
  const showAlt2 = alt2 && (alt2.from !== userMove.from || alt2.to !== userMove.to)

  return (
    <div className={styles.moveStrip}>
      {showAlt1 && renderMoveCard(alt1, 'alt1')}
      {showAlt2 && renderMoveCard(alt2, 'alt2')}
      {showUserMove && renderMoveCard(userMove, 'userMove')}
    </div>
  )
}