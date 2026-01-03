import { Chess, Move as ChessMove } from 'chess.js'
import type { MoveAnalysis, PlayerColor, PositionAnalysis } from '../types/analysis'
import { buildExplanation } from './mockExplanations'

interface AnalysisInput {
  fen: string
  moveNumber: number
  playerColor: PlayerColor
  baseEval: number
  userMoveHint?: { notation: string; from: string; to: string }
}

function makeUci(move: ChessMove) {
  const promotion = move.promotion ? move.promotion : ''
  return `${move.from}${move.to}${promotion}`
}

function evalForRank(baseEval: number, rank: number, playerColor: PlayerColor, moveNumber: number) {
  const direction = playerColor === 'white' ? 1 : -1
  const attenuation = 0.45 - (rank - 1) * 0.07
  const jitter = ((moveNumber * 13 + rank * 7) % 5 - 2) * 0.01
  return baseEval + direction * attenuation + jitter
}

function buildMoveList(fen: string, playerColor: PlayerColor, baseEval: number, moveNumber: number) {
  const chess = new Chess(fen)
  const verboseMoves = chess.moves({ verbose: true })
  const selected = verboseMoves.slice(0, Math.max(10, verboseMoves.length))

  if (selected.length === 0) {
    return [
      {
        notation: '—',
        from: 'a1',
        to: 'a1',
        evaluation: baseEval,
        rank: 1,
        uci: 'a1a1',
        explanation: 'No legal moves. Stalemate or checkmate position.',
      },
    ]
  }

  return selected.slice(0, 10).map((move, index) => {
    const rank = index + 1
    const evaluation = evalForRank(baseEval, rank, playerColor, moveNumber)
    return {
      notation: move.san,
      from: move.from,
      to: move.to,
      evaluation,
      rank,
      uci: makeUci(move),
      explanation: buildExplanation(move.san, evaluation, rank),
    }
  })
}

export function generateAnalysisForPosition({
  fen,
  moveNumber,
  playerColor,
  baseEval,
  userMoveHint,
}: AnalysisInput): PositionAnalysis {
  const moves = buildMoveList(fen, playerColor, baseEval, moveNumber)

  const totalMoves = moves.length
  const userRank = Math.min(Math.max(3, (moveNumber % 6) + 3), totalMoves)

  const hintedIndex = userMoveHint
    ? moves.findIndex(
        (m) =>
          m.notation === userMoveHint.notation ||
          (m.from === userMoveHint.from && m.to === userMoveHint.to),
      )
    : -1

  const userMoveCandidate =
    hintedIndex >= 0
      ? moves[hintedIndex]
      : moves[Math.min(totalMoves - 1, userRank - 1)]

  const reordered: MoveAnalysis[] = []
  let cursor = 0
  for (let i = 0; i < totalMoves; i += 1) {
    if (i === userRank - 1) {
      reordered.push({
        ...userMoveCandidate,
        rank: userRank,
        evaluation: evalForRank(baseEval, userRank, playerColor, moveNumber) - 0.08,
        explanation: buildExplanation(
          userMoveCandidate.notation,
          evalForRank(baseEval, userRank, playerColor, moveNumber) - 0.08,
          userRank,
        ),
      })
      continue
    }

    const sourceMove = moves[cursor]
    if (sourceMove === userMoveCandidate) {
      cursor += 1
    }
    const move = moves[cursor]
    reordered.push({
      ...move,
      rank: i + 1,
      evaluation: evalForRank(baseEval, i + 1, playerColor, moveNumber),
      explanation: buildExplanation(
        move.notation,
        evalForRank(baseEval, i + 1, playerColor, moveNumber),
        i + 1,
      ),
    })
    cursor += 1
  }

  const userMove = reordered[userRank - 1] ?? reordered[reordered.length - 1]
  const bestMoves = reordered.slice(0, 2)

  return {
    position: fen,
    moveNumber,
    playerToMove: playerColor,
    moves: reordered,
    userMove,
    bestMoves,
  }
}
