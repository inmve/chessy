export type PlayerColor = 'white' | 'black'

export interface MoveAnalysis {
  notation: string // SAN such as "Nf3"
  uci: string // UCI for applying moves in chess.js
  from: string
  to: string
  evaluation: number
  rank: number
  explanation: string
}

export interface PositionAnalysis {
  position: string // FEN
  moveNumber: number
  playerToMove: PlayerColor
  moves: MoveAnalysis[]
  userMove: MoveAnalysis
  bestMoves: MoveAnalysis[] // top 2
}
