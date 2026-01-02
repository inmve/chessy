const advicePool = [
  'controls the center and prepares development',
  'develops with tempo and eyes a kingside attack',
  'keeps the position flexible while limiting counterplay',
  'prepares castling safety before striking in the middle',
  'seizes open lines for the rooks and queen',
  'trades space for activity and quicker piece coordination',
  'aims at the weak dark squares and restricts the enemy king',
  'simplifies into an endgame that favors your pawn structure',
  'creates a pawn hook to pry open files',
  'avoids immediate tactics while keeping long-term pressure',
]

const mistakePool = [
  'drops material that cannot be recovered',
  'ignores a tactical shot and loses tempo',
  'weakens dark squares around the king',
  'misplaces the queen and blocks coordination',
  'opens a file for the opponent to attack the king',
  'walks into a fork and removes your best defender',
]

export function buildExplanation(notation: string, evaluation: number, rank: number) {
  const pool = evaluation < -0.4 ? mistakePool : advicePool
  const seed = Math.abs(Math.round(evaluation * 10) + rank)
  const line = pool[seed % pool.length]
  if (rank === 1) {
    return `${notation} is the cleanest continuation: it ${line}.`
  }
  if (rank <= 3) {
    return `${notation} keeps pressure while it ${line}.`
  }
  if (evaluation < -1) {
    return `${notation} is risky: it ${line}.`
  }
  return `${notation} is playable but it ${line}.`
}
