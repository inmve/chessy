import type { PlayerColor, PositionAnalysis } from './analysis'

export interface GamePosition {
  moveNumber: number
  fen: string
  notation: string
  playerColor: PlayerColor
  from: string
  to: string
  evaluation: number
}

export interface GraphPoint {
  moveNumber: number
  evaluation: number
  delta: number
  category: 'blunder' | 'mistake' | 'inaccuracy' | 'normal'
  playerColor: PlayerColor
}

export interface MockGameState {
  positions: GamePosition[]
  analyses: PositionAnalysis[]
  graph: GraphPoint[]
  totalMoves: number
}
