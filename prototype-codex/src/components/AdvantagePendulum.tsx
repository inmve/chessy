import type { CSSProperties } from 'react'
import styles from '../App.module.css'

interface AdvantagePendulumProps {
  currentEvaluation: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const formatEval = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`

export function AdvantagePendulum({ currentEvaluation }: AdvantagePendulumProps) {
  const maxEval = 3
  const clampedEval = clamp(currentEvaluation, -maxEval, maxEval)
  const pendulumPosition = ((clampedEval + maxEval) / (maxEval * 2)) * 100
  const pendulumStyle = {
    '--pendulum-position': `${pendulumPosition}%`,
  } as CSSProperties

  return (
    <div className={styles.pendulum}>
      <div className={styles.pendulumLabelTop}>White</div>
      <div className={styles.pendulumTrack} style={pendulumStyle}>
        <div className={styles.pendulumFlow} />
        <div className={styles.pendulumBob} />
      </div>
      <div className={styles.pendulumLabelBottom}>Black</div>
      <div
        className={`${styles.pendulumValue} ${
          currentEvaluation >= 0 ? styles.pendulumPositive : styles.pendulumNegative
        }`}
      >
        Eval {formatEval(currentEvaluation)}
      </div>
    </div>
  )
}
