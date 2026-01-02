import styles from '../App.module.css'

interface DivergenceBannerProps {
  pathDescription: string
  onReturn: () => void
}

export function DivergenceBanner({ pathDescription, onReturn }: DivergenceBannerProps) {
  return (
    <div className={styles.divergenceBanner}>
      <div className={styles.bannerText}>⚠ DIVERGED | {pathDescription}</div>
      <button className={styles.bannerButton} onClick={onReturn}>
        ← Back to game line
      </button>
    </div>
  )
}
