import styles from '../App.module.css'

interface NavigationBarProps {
  moveNumber: number
  totalMoves: number
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function NavigationBar({
  moveNumber,
  totalMoves,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: NavigationBarProps) {
  return (
    <div className={styles.navBar}>
      <button className={styles.navBtn} onClick={onPrev} disabled={!canGoPrev}>
        ‹
      </button>
      <div className={styles.navStatus}>
        Move {moveNumber} of {totalMoves}
      </div>
      <button className={styles.navBtn} onClick={onNext} disabled={!canGoNext}>
        ›
      </button>
    </div>
  )
}
