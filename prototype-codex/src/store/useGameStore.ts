import { create } from 'zustand'
import { Chess } from 'chess.js'
import { stockfish, type EngineAnalysis, type EngineDone } from '../engine/stockfish'
import { buildMockGameState } from '../mock/mockGameState'
import { generateAnalysisForPosition } from '../mock/mockAnalysis'
import { buildExplanation } from '../mock/mockExplanations'
import type { MoveAnalysis, PlayerColor, PositionAnalysis } from '../types/analysis'
import type { GraphPoint, MockGameState } from '../types/game'

const baseGame: MockGameState = buildMockGameState()

const ENGINE_MULTIPV = 5
const ENGINE_TIME_MS = 500
const ENGINE_MIN_DEPTH = 12
const USER_MOVE_TIME_MS = 150
const USER_MOVE_MIN_DEPTH = 8
const GRAPH_TIME_MS = 220
const GRAPH_MIN_DEPTH = 10

const engineExplanation = (depth: number, score: number) =>
  `Stockfish (d${depth}): ${score > 0 ? '+' : ''}${score.toFixed(2)}`

const isEngineExplanation = (text: string) => text.startsWith('Stockfish')

function fenToTurn(fen: string): PlayerColor {
  const parts = fen.split(' ')
  return parts[1] === 'b' ? 'black' : 'white'
}

function normalizeScore(score: number, fen: string) {
  return fenToTurn(fen) === 'white' ? score : -score
}

// Setup Stockfish callback
stockfish.setCallback((data) => {
  useGameStore.getState().updateEngineAnalysis(data)
})
stockfish.setDoneCallback((data) => {
  useGameStore.getState().handleEngineDone(data)
})

function classifyDelta(delta: number) {
  if (delta > 1) return 'blunder' as const
  if (delta > 0.3) return 'mistake' as const
  if (delta > 0.1) return 'inaccuracy' as const
  return 'normal' as const
}

function buildGraphFromPositions(positions: MockGameState['positions']): GraphPoint[] {
  return positions.map((pos, index) => {
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
}

function buildGraphQueue(
  currentIndex: number,
  totalMoves: number,
  ready: boolean[],
): number[] {
  const order: number[] = []
  for (let offset = 0; offset < totalMoves; offset += 1) {
    const forward = currentIndex + offset
    if (forward < totalMoves) order.push(forward)
    const backward = currentIndex - offset
    if (offset > 0 && backward >= 0) order.push(backward)
  }
  return order.filter((index) => !ready[index])
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
  analyzingFen: string | null
  analysisToken: number | null
  graphQueue: number[]
  graphAnalyzingIndex: number | null
  graphAnalysisToken: number | null
  graphEvalReady: boolean[]
  goToMove: (moveNumber: number) => void
  nextMove: () => void
  prevMove: () => void
  exploreMove: (move: MoveAnalysis) => boolean
  exploreMoveFromSquares: (from: string, to: string) => boolean
  importGameFromPgn: (pgn: string) => boolean
  returnToOriginal: () => void
  startAnalysis: (fen: string) => void
  scheduleGraphAnalysis: (fromIndex: number) => void
  startNextGraphAnalysis: () => void
  updateEngineAnalysis: (data: EngineAnalysis) => void
  handleEngineDone: (data: EngineDone) => void
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

export const useGameStore = create<GameStoreState>((set, get) => ({
  currentIndex: 0,
  exploration: [],
  positions: baseGame.positions.map((pos) => ({ ...pos, evaluation: 0 })),
  analyses: baseGame.analyses.map((analysis) => ({
    ...analysis,
    bestMoves: [],
    userMove: {
      ...analysis.userMove,
      evaluation: 0,
      explanation: 'Analyzing...',
    },
  })),
  graph: buildGraphFromPositions(baseGame.positions.map((pos) => ({ ...pos, evaluation: 0 }))),
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

      const replayChess = new Chess()
      history.forEach((move, i) => {
        const fenBefore = replayChess.fen()
        replayChess.move(move)

        positions.push({
          moveNumber: i + 1,
          fen: fenBefore,
          notation: move.san,
          playerColor: move.color === 'w' ? 'white' : 'black',
          from: move.from,
          to: move.to,
          evaluation: 0,
        })
      })

      const analyses = positions.map((pos) => {
        const analysis = generateAnalysisForPosition({
          fen: pos.fen,
          moveNumber: pos.moveNumber,
          playerColor: pos.playerColor,
          baseEval: pos.evaluation,
          userMoveHint: { notation: pos.notation, from: pos.from, to: pos.to },
        })
        return {
          ...analysis,
          bestMoves: [],
          userMove: {
            ...analysis.userMove,
            evaluation: 0,
            explanation: 'Analyzing...',
          },
        } as PositionAnalysis
      })

      const graph = buildGraphFromPositions(positions)

      set({
        currentIndex: 0,
        exploration: [],
        positions,
        analyses,
        graph,
        totalMoves: positions.length,
        userColor: 'white',
        graphEvalReady: positions.map(() => false),
        graphQueue: [],
        graphAnalyzingIndex: null,
        graphAnalysisToken: null,
        analyzingFen: null,
        analysisToken: null,
      })
      return true
    } catch (e) {
      console.error('Failed to import PGN:', e)
      return false
    }
  },
  returnToOriginal: () => set(() => ({ exploration: [] })),
  analyzingFen: null,
  analysisToken: null,
  graphQueue: [],
  graphAnalyzingIndex: null,
  graphAnalysisToken: null,
  graphEvalReady: baseGame.positions.map(() => false),
  startAnalysis: (fen: string) => {
    if (!fen) return
    if (get().analyzingFen === fen) return
    set((state) => {
      let newGraphQueue = state.graphQueue
      if (state.graphAnalyzingIndex !== null && !state.graphEvalReady[state.graphAnalyzingIndex]) {
        newGraphQueue = [
          state.graphAnalyzingIndex,
          ...state.graphQueue.filter((index) => index !== state.graphAnalyzingIndex),
        ]
      }

      let newAnalyses = state.analyses
      const mainIndex = state.analyses.findIndex((a) => a.position === fen)
      if (mainIndex !== -1) {
        newAnalyses = [...state.analyses]
        const analysis = { ...newAnalyses[mainIndex] }
        const hasEngineMoves = analysis.bestMoves?.some((m) => isEngineExplanation(m.explanation))
        if (!hasEngineMoves) {
          analysis.bestMoves = []
        }
        newAnalyses[mainIndex] = analysis
      }

      let newExploration = state.exploration
      const expIndex = state.exploration.findIndex((n) => n.analysis.position === fen)
      if (expIndex !== -1) {
        newExploration = [...state.exploration]
        const node = { ...newExploration[expIndex] }
        const analysis = { ...node.analysis }
        const hasEngineMoves = analysis.bestMoves?.some((m) => isEngineExplanation(m.explanation))
        if (!hasEngineMoves) {
          analysis.bestMoves = []
        }
        node.analysis = analysis
        newExploration[expIndex] = node
      }

      return {
        analyzingFen: fen,
        analyses: newAnalyses,
        exploration: newExploration,
        graphQueue: newGraphQueue,
        graphAnalyzingIndex: null,
        graphAnalysisToken: null,
      }
    })
    const token = stockfish.analyze({
      fen,
      multipv: ENGINE_MULTIPV,
      timeMs: ENGINE_TIME_MS,
      minDepth: ENGINE_MIN_DEPTH,
      kind: 'multipv',
    })
    set({ analysisToken: token ?? null })
  },
  scheduleGraphAnalysis: (fromIndex: number) => {
    set((state) => ({
      graphQueue: buildGraphQueue(fromIndex, state.totalMoves, state.graphEvalReady),
    }))
    get().startNextGraphAnalysis()
  },
  startNextGraphAnalysis: () => {
    const state = get()
    if (state.graphAnalyzingIndex !== null) return
    if (state.analyzingFen) return
    if (state.graphQueue.length === 0) return

    const nextIndex = state.graphQueue.find((index) => !state.graphEvalReady[index])
    if (nextIndex === undefined) return
    const nextFen = state.positions[nextIndex]?.fen
    if (!nextFen) return

    const token = stockfish.analyze({
      fen: nextFen,
      multipv: 1,
      timeMs: GRAPH_TIME_MS,
      minDepth: GRAPH_MIN_DEPTH,
      kind: 'graph',
    })
    set((prev) => ({
      graphQueue: prev.graphQueue.filter((index) => index !== nextIndex),
      graphAnalyzingIndex: nextIndex,
      graphAnalysisToken: token ?? null,
    }))
  },
  updateEngineAnalysis: (data: EngineAnalysis) => {
    set((state) => {
      if (data.kind === 'graph') {
        if (state.graphAnalysisToken !== data.token) return {}
        const index =
          state.graphAnalyzingIndex ??
          state.positions.findIndex((position) => position.fen === data.fen)
        if (index === -1) return {}

        const normalizedScore = normalizeScore(data.score, data.fen)
        const positions = [...state.positions]
        positions[index] = { ...positions[index], evaluation: normalizedScore }

        const graph = buildGraphFromPositions(positions)
        return { positions, graph }
      }

      const fen = state.analyzingFen
      if (!fen) return {}
      if (state.analysisToken !== data.token) return {}
      if (data.fen !== fen) return {}

      const moveUci = data.kind === 'user-move' ? data.moveUci : data.pv.split(' ')[0]
      if (!moveUci) return {}

      const from = moveUci.substring(0, 2)
      const to = moveUci.substring(2, 4)
      const promotion = moveUci.length > 4 ? moveUci.substring(4, 5) : undefined

      const tempChess = new Chess(fen)
      let moveResult
      try {
        moveResult = tempChess.move({ from, to, promotion: promotion || 'q' })
      } catch {
        return {}
      }

      if (!moveResult) return {}

      const moveFen = data.kind === 'user-move' ? tempChess.fen() : fen
      const normalizedScore = normalizeScore(data.score, moveFen)
      const newMove: MoveAnalysis = {
        notation: moveResult.san,
        uci: moveUci,
        from,
        to,
        evaluation: normalizedScore,
        rank: data.multipv,
        explanation: engineExplanation(data.depth, normalizedScore),
      }

      let newAnalyses = state.analyses
      const mainIndex = state.analyses.findIndex((a) => a.position === fen)
      if (mainIndex !== -1) {
        newAnalyses = [...state.analyses]
        const analysis = { ...newAnalyses[mainIndex] }
        if (data.kind === 'user-move') {
          if (analysis.userMove.from === from && analysis.userMove.to === to) {
            analysis.userMove = {
              ...analysis.userMove,
              evaluation: normalizedScore,
              explanation: newMove.explanation,
            }
          }
        } else {
          const bestMoves = [...(analysis.bestMoves || [])]
          const existingIndex = bestMoves.findIndex((m) => m.from === from && m.to === to)
          if (existingIndex >= 0) {
            bestMoves[existingIndex] = { ...bestMoves[existingIndex], ...newMove }
          } else if (bestMoves.length < ENGINE_MULTIPV) {
            bestMoves.push(newMove)
          }
          analysis.bestMoves = bestMoves
          if (analysis.userMove.from === from && analysis.userMove.to === to) {
            analysis.userMove = {
              ...analysis.userMove,
              evaluation: normalizedScore,
              explanation: newMove.explanation,
            }
          }
        }
        newAnalyses[mainIndex] = analysis
      }

      let newExploration = state.exploration
      const expIndex = state.exploration.findIndex((n) => n.analysis.position === fen)
      if (expIndex !== -1) {
        newExploration = [...state.exploration]
        const node = { ...newExploration[expIndex] }
        const analysis = { ...node.analysis }
        if (data.kind === 'user-move') {
          if (analysis.userMove.from === from && analysis.userMove.to === to) {
            analysis.userMove = {
              ...analysis.userMove,
              evaluation: normalizedScore,
              explanation: newMove.explanation,
            }
          }
        } else {
          const bestMoves = [...(analysis.bestMoves || [])]
          const existingIndex = bestMoves.findIndex((m) => m.from === from && m.to === to)
          if (existingIndex >= 0) {
            bestMoves[existingIndex] = { ...bestMoves[existingIndex], ...newMove }
          } else if (bestMoves.length < ENGINE_MULTIPV) {
            bestMoves.push(newMove)
          }
          analysis.bestMoves = bestMoves
          if (analysis.userMove.from === from && analysis.userMove.to === to) {
            analysis.userMove = {
              ...analysis.userMove,
              evaluation: normalizedScore,
              explanation: newMove.explanation,
            }
          }
        }
        node.analysis = analysis
        newExploration[expIndex] = node
      }

      return { analyses: newAnalyses, exploration: newExploration }
    })
  },
  handleEngineDone: (data: EngineDone) => {
    const state = get()
    if (data.kind === 'graph') {
      if (state.graphAnalysisToken !== data.token) return
      if (state.graphAnalyzingIndex === null) return
      if (data.fen !== state.positions[state.graphAnalyzingIndex]?.fen) return
      set((prev) => {
        const graphEvalReady = [...prev.graphEvalReady]
        graphEvalReady[prev.graphAnalyzingIndex ?? 0] = true
        return { graphAnalyzingIndex: null, graphAnalysisToken: null, graphEvalReady }
      })
      get().startNextGraphAnalysis()
      return
    }

    if (data.kind === 'user-move') {
      if (!state.analyzingFen) return
      if (state.analysisToken !== data.token) return
      if (data.fen !== state.analyzingFen) return
      set({ analyzingFen: null, analysisToken: null })
      get().startNextGraphAnalysis()
      return
    }

    if (!state.analyzingFen) return
    if (state.analysisToken !== data.token) return
    if (data.fen !== state.analyzingFen) return
    if (data.kind !== 'multipv') return

    const analysis =
      state.analyses.find((a) => a.position === data.fen) ??
      state.exploration.find((n) => n.analysis.position === data.fen)?.analysis

    if (!analysis) return
    const userMove = analysis.userMove
    if (!userMove || userMove.from === userMove.to) {
      set({ analyzingFen: null, analysisToken: null })
      get().startNextGraphAnalysis()
      return
    }
    if (isEngineExplanation(userMove.explanation)) {
      set({ analyzingFen: null, analysisToken: null })
      get().startNextGraphAnalysis()
      return
    }

    const token = stockfish.analyze({
      fen: data.fen,
      multipv: 1,
      timeMs: USER_MOVE_TIME_MS,
      minDepth: USER_MOVE_MIN_DEPTH,
      kind: 'user-move',
      moveUci: userMove.uci,
    })
    set({ analysisToken: token ?? state.analysisToken })
  },
}))
