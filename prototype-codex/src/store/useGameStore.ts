import { create } from 'zustand'
import { Chess } from 'chess.js'
import { buildMockGameState } from '../mock/mockGameState'
import { generateAnalysisForPosition } from '../mock/mockAnalysis'
import { buildExplanation } from '../mock/mockExplanations'
import type { MoveAnalysis, PlayerColor, PositionAnalysis } from '../types/analysis'
import type { GraphPoint, MockGameState } from '../types/game'

const baseGame: MockGameState = buildMockGameState()

function classifyDelta(delta: number) {
  if (delta > 1) return 'blunder' as const
  if (delta > 0.3) return 'mistake' as const
  if (delta > 0.1) return 'inaccuracy' as const
  return 'normal' as const
}

interface ExplorationNode {
  fen: string
  moveNumber: number
  playerToMove: PlayerColor
  analysis: PositionAnalysis
  originAnalysis: PositionAnalysis
  entryMove: MoveAnalysis
  evaluation: number
  delta: number
  category: GraphPoint['category']
}

interface GameStoreState {
  currentIndex: number
  exploration: ExplorationNode[]
  positions: MockGameState['positions']
  analyses: MockGameState['analyses']
  graph: MockGameState['graph']
  totalMoves: number
  userColor: PlayerColor
  goToMove: (moveNumber: number) => void
  nextMove: () => void
  prevMove: () => void
  exploreMove: (move: MoveAnalysis) => boolean
  exploreMoveFromSquares: (from: string, to: string) => boolean
  importGameFromPgn: (pgn: string) => boolean
  returnToOriginal: () => void
}

function buildMoveAnalysis({
  move,
  baseEval,
  moveNumber,
  currentAnalysis,
}: {
  move: { san: string; from: string; to: string; promotion?: string }
  baseEval: number
  moveNumber: number
  currentAnalysis: PositionAnalysis
}): MoveAnalysis {
  const found = currentAnalysis.moves.find((m) => m.from === move.from && m.to === move.to)
  if (found) {
    return {
      ...found,
      notation: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    }
  }

  const hash = move.from.charCodeAt(0) + move.to.charCodeAt(0) + moveNumber * 3
  const jitter = ((hash % 9) - 4) * 0.07
  const evaluation = Math.max(-3, Math.min(3, baseEval + jitter))
  const rank = Math.min(10, currentAnalysis.moves.length || 10)

  return {
    notation: move.san,
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    from: move.from,
    to: move.to,
    evaluation,
    rank,
    explanation: buildExplanation(move.san, evaluation, rank),
  }
}

function buildExplorationNode(
  state: {
    currentIndex: number
    exploration: ExplorationNode[]
    positions: MockGameState['positions']
    analyses: MockGameState['analyses']
    graph: MockGameState['graph']
  },
  move: MoveAnalysis,
  nextFen: string,
  nextColor: PlayerColor,
  originAnalysis: PositionAnalysis,
  prevEval: number,
): ExplorationNode {
  const baseMoveNumber = state.positions[state.currentIndex].moveNumber
  const moveNumber = baseMoveNumber
  const newAnalysis = generateAnalysisForPosition({
    fen: nextFen,
    moveNumber,
    playerColor: nextColor,
    baseEval: move.evaluation,
  })

  const delta = Math.abs(prevEval - move.evaluation)

  return {
    fen: nextFen,
    moveNumber,
    playerToMove: nextColor,
    analysis: newAnalysis,
    originAnalysis,
    entryMove: move,
    evaluation: move.evaluation,
    delta,
    category: classifyDelta(delta),
  }
}

export function buildExplorationGraph(
  exploration: ExplorationNode[],
  divergenceEval: number,
): GraphPoint[] {
  const points: GraphPoint[] = []
  let prevEval = divergenceEval

  exploration.forEach((node) => {
    const delta = Math.abs(prevEval - node.evaluation)
    const moverColor: PlayerColor = node.playerToMove === 'white' ? 'black' : 'white'
    points.push({
      moveNumber: node.moveNumber,
      evaluation: node.evaluation,
      delta,
      category: classifyDelta(delta),
      playerColor: moverColor,
    })
    prevEval = node.evaluation
  })

  return points
}

export const useGameStore = create<GameStoreState>((set) => ({
  currentIndex: 0,
  exploration: [],
  positions: baseGame.positions,
  analyses: baseGame.analyses,
  graph: baseGame.graph,
  totalMoves: baseGame.totalMoves,
  userColor: 'white',
  goToMove: (moveNumber: number) =>
    set(() => {
      const bounded = Math.min(Math.max(1, moveNumber), baseGame.totalMoves)
      return {
        currentIndex: bounded - 1,
        exploration: [],
      }
    }),
  nextMove: () =>
    set((state) => {
      if (state.exploration.length > 0) return {}
      return { currentIndex: Math.min(state.currentIndex + 1, state.totalMoves - 1) }
    }),
  prevMove: () =>
    set((state) => {
      if (state.exploration.length > 0) {
        return { exploration: state.exploration.slice(0, -1) }
      }
      return { currentIndex: Math.max(state.currentIndex - 1, 0) }
    }),
  exploreMove: (move: MoveAnalysis) => {
    let applied = false
    set((state) => {
      const isExploration = state.exploration.length > 0
      const originAnalysis = isExploration
        ? state.exploration[state.exploration.length - 1].analysis
        : state.analyses[state.currentIndex + 1]

      if (!originAnalysis) return {}

      const currentFen = originAnalysis.position
      const prevEval = isExploration
        ? state.exploration[state.exploration.length - 1].evaluation
        : state.graph[state.currentIndex + 1]?.evaluation ?? state.graph[state.currentIndex].evaluation

      // Check if this move puts us back on the main line (convergence)
      // For now, simpler: if not exploring and move matches next main line move, just nextMove?
      // But nextMove() is a separate action. Let's keep exploration explicit for now unless requested.
      // Actually, if we are NOT exploring, and we pick a move, we usually want to START exploration (unless it's the main move).
      // But the user UI might distinguish "Next" vs "Explore".
      // If we treat all strip clicks as "Explore", we diverge.
      // Let's stick to appending to exploration.

      const chess = new Chess(currentFen)
      const result = chess.move({ from: move.from, to: move.to, promotion: 'q' })
      if (!result) return {}

      const nextFen = chess.fen()
      const nextColor: PlayerColor = chess.turn() === 'w' ? 'white' : 'black'
      const newNode = buildExplorationNode(state, move, nextFen, nextColor, originAnalysis, prevEval)
      applied = true
      return { exploration: [...state.exploration, newNode] }
    })
    return applied
  },
  exploreMoveFromSquares: (from: string, to: string) => {
    let applied = false
    set((state) => {
      const isExploration = state.exploration.length > 0
      const originAnalysis = isExploration
        ? state.exploration[state.exploration.length - 1].analysis
        : state.analyses[state.currentIndex + 1]

      if (!originAnalysis) return {}

      const currentFen = originAnalysis.position
      const currentAnalysis = originAnalysis
      const baseEval = isExploration
        ? state.exploration[state.exploration.length - 1].evaluation
        : state.graph[state.currentIndex + 1]?.evaluation ?? state.graph[state.currentIndex].evaluation

      const chess = new Chess(currentFen)
      const moveResult = chess.move({ from, to, promotion: 'q' })
      if (!moveResult) return {}

      const nextFen = chess.fen()
      const nextColor: PlayerColor = chess.turn() === 'w' ? 'white' : 'black'

      const moveAnalysis = buildMoveAnalysis({
        move: moveResult,
        baseEval,
        moveNumber: originAnalysis.moveNumber + 1, // Next move number
        currentAnalysis,
      })

      const newNode = buildExplorationNode(
        state,
        moveAnalysis,
        nextFen,
        nextColor,
        originAnalysis,
        baseEval,
      )
      applied = true
      return { exploration: [...state.exploration, newNode] }
    })
    return applied
  },
  importGameFromPgn: (pgn: string) => {
    try {
      const chess = new Chess()
      chess.loadPgn(pgn)
      const history = chess.history({ verbose: true })
      const positions: MockGameState['positions'] = []
      let evalScore = 0.1

      const replayChess = new Chess()
      history.forEach((move, i) => {
        const fenBefore = replayChess.fen()
        replayChess.move(move)
        
        // Random walk eval simulation
        evalScore += (Math.random() - 0.5) * 0.8
        evalScore = Math.max(-3, Math.min(3, evalScore))

        positions.push({
          moveNumber: i + 1,
          fen: fenBefore,
          notation: move.san,
          playerColor: move.color === 'w' ? 'white' : 'black',
          from: move.from,
          to: move.to,
          evaluation: evalScore,
        })
      })

      const analyses = positions.map((pos) =>
        generateAnalysisForPosition({
          fen: pos.fen,
          moveNumber: pos.moveNumber,
          playerColor: pos.playerColor,
          baseEval: pos.evaluation,
          userMoveHint: { notation: pos.notation, from: pos.from, to: pos.to },
        }),
      )

      const graph: GraphPoint[] = positions.map((pos, index) => {
        const prevEval = index === 0 ? 0 : positions[index - 1].evaluation
        const drop =
          pos.playerColor === 'white' ? prevEval - pos.evaluation : pos.evaluation - prevEval
        return {
          moveNumber: pos.moveNumber,
          evaluation: pos.evaluation,
          delta: drop,
          category: classifyDelta(Math.max(drop, 0)),
          playerColor: pos.playerColor,
        }
      })

      set({
        currentIndex: 0,
        exploration: [],
        positions,
        analyses,
        graph,
        totalMoves: positions.length,
        userColor: 'white',
      })
      return true
    } catch (e) {
      console.error('Failed to import PGN:', e)
      return false
    }
  },
  returnToOriginal: () => set(() => ({ exploration: [] })),
}))
