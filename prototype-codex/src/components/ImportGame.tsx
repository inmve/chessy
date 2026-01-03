import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import styles from '../App.module.css'

export function ImportGame() {
  const [pgn, setPgn] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const importGameFromPgn = useGameStore((state) => state.importGameFromPgn)

  const handleImport = () => {
    if (!pgn.trim()) return
    const success = importGameFromPgn(pgn)
    if (success) {
      setIsOpen(false)
      setPgn('')
    } else {
      alert('Invalid PGN')
    }
  }

  if (!isOpen) {
    return (
      <button className={styles.importTriggerBtn} onClick={() => setIsOpen(true)}>
        Import PGN
      </button>
    )
  }

  return (
    <div className={styles.importModalOverlay}>
      <div className={styles.importModal}>
        <h3>Import Game (PGN)</h3>
        <textarea
          className={styles.pgnInput}
          placeholder="Paste PGN here..."
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
        />
        <div className={styles.importActions}>
          <button className={styles.cancelBtn} onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button className={styles.importBtn} onClick={handleImport}>
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
