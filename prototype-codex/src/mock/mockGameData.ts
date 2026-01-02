import { Chess } from 'chess.js'
import type { GamePosition } from '../types/game'

const sanMoves = [
  'e4',
  'e5',
  'Nf3',
  'Nc6',
  'Bb5',
  'a6',
  'Ba4',
  'Nf6',
  'O-O',
  'Be7',
  'Re1',
  'b5',
  'Bb3',
  'd6',
  'c3',
  'O-O',
  'h3',
  'Nb8',
  'd4',
  'Nbd7',
  'c4',
  'c6',
  'Nc3',
  'Qc7',
  'a3',
  'Bb7',
  'cxb5',
  'axb5',
  'Bg5',
  'Rfe8',
]

const evaluationCurve = [
  0.1,
  0.15,
  0.2,
  0.1,
  0.35,
  0.25,
  0.5,
  0.4,
  0.65,
  0.55,
  0.8,
  0.6,
  0.9,
  0.7,
  1.05,
  0.85,
  0.95,
  0.4,
  -0.1,
  -0.6,
  -0.45,
  -1.6,
  -1.25,
  -1.1,
  -0.75,
  -0.3,
  -0.45,
  0.05,
  -0.05,
  -0.5,
]

export const totalMoves = sanMoves.length

export function generateMockGamePositions(): GamePosition[] {
  const chess = new Chess()
  const positions: GamePosition[] = []

  sanMoves.forEach((san, index) => {
    const fenBefore = chess.fen()
    const move = chess.move(san)

    if (!move) {
      return
    }

    positions.push({
      moveNumber: index + 1,
      fen: fenBefore,
      notation: san,
      playerColor: move.color === 'w' ? 'white' : 'black',
      from: move.from,
      to: move.to,
      evaluation: evaluationCurve[index] ?? 0,
    })
  })

  return positions
}
