import type { MoveAnalysis } from '../types/analysis'
import styles from '../App.module.css'

interface MoveStripProps {
  bestMoves: MoveAnalysis[]
  userMove: MoveAnalysis
  onMoveClick: (move: MoveAnalysis) => void
  showUserMove: boolean
}

const buildLabel = (move: MoveAnalysis) =>
  `${move.rank}. ${move.notation} (${move.evaluation > 0 ? '+' : ''}${move.evaluation.toFixed(2)})`

export function MoveStrip({ bestMoves, userMove, onMoveClick, showUserMove }: MoveStripProps) {
  const [alt1, alt2] = bestMoves

  return (
    <div className={styles.moveStrip}>
      {alt1 && (alt1.from !== userMove.from || alt1.to !== userMove.to) && (
        <button
          className={`${styles.moveButton} ${styles.alt1}`}
          onClick={() => onMoveClick(alt1)}
          title={alt1.explanation}
        >
          {buildLabel(alt1)}
        </button>
      )}
      {alt2 && (alt2.from !== userMove.from || alt2.to !== userMove.to) && (
        <button
          className={`${styles.moveButton} ${styles.alt2}`}
          onClick={() => onMoveClick(alt2)}
          title={alt2.explanation}
        >
          {buildLabel(alt2)}
        </button>
      )}
      {showUserMove && (
        <button
          className={`${styles.moveButton} ${styles.userMove}`}
          onClick={() => onMoveClick(userMove)}
          title={userMove.explanation}
        >
          {buildLabel(userMove)}
        </button>
      )}
    </div>
  )
}
