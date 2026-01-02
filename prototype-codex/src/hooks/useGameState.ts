import { Chess } from 'chess.js'
import { useMemo, useState } from 'react'
import { buildMockGameState } from '../mock/mockGameState'
import { generateAnalysisForPosition } from '../mock/mockAnalysis'
import type { MoveAnalysis, PlayerColor, PositionAnalysis } from '../types/analysis'
import type { GraphPoint, MockGameState } from '../types/game'

interface ExplorationNode {
  fen: string
  moveNumber: number
  playerToMove: PlayerColor
  analysis: PositionAnalysis
  entryMove: MoveAnalysis
}

interface GameStateResult {
  moveNumber: number
  totalMoves: number
  position: string
  playerToMove: PlayerColor
  analysis: PositionAnalysis
  graph: GraphPoint[]
  isDiverged: boolean
  explorationPath: MoveAnalysis[]
  goToMove: (moveNumber: number) => void
  exploreMove: (move: MoveAnalysis) => void
  returnToOriginal: () => void
  nextMove: () => void
  prevMove: () => void
}

export function useGameState(): GameStateResult {
  const initialGame: MockGameState = useMemo(() => buildMockGameState(), [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [explorationStack, setExplorationStack] = useState<ExplorationNode[]>([])

  const basePosition = initialGame.positions[currentIndex]
  const baseAnalysis = initialGame.analyses[currentIndex]
  const isDiverged = explorationStack.length > 0
  const activeExploration = explorationStack[explorationStack.length - 1]

  const position = isDiverged ? activeExploration.fen : baseAnalysis.position
  const analysis = isDiverged ? activeExploration.analysis : baseAnalysis
  const playerToMove = isDiverged ? activeExploration.playerToMove : baseAnalysis.playerToMove
  const moveNumber = basePosition.moveNumber

  const explorationPath = explorationStack.map((node) => node.entryMove)

  const goToMove = (target: number) => {
    const bounded = Math.min(Math.max(1, target), initialGame.totalMoves)
    setExplorationStack([])
    setCurrentIndex(bounded - 1)
  }

  const exploreMove = (move: MoveAnalysis) => {
    const chess = new Chess(position)
    const applied = chess.move({ from: move.from, to: move.to, promotion: 'q' })
    if (!applied) return
    const nextFen = chess.fen()
    const nextColor: PlayerColor = chess.turn() === 'w' ? 'white' : 'black'

    const newAnalysis = generateAnalysisForPosition({
      fen: nextFen,
      moveNumber: moveNumber + explorationStack.length + 1,
      playerColor: nextColor,
      baseEval: move.evaluation,
    })

    setExplorationStack((prev) => [
      ...prev,
      {
        fen: nextFen,
        moveNumber: moveNumber + prev.length + 1,
        playerToMove: nextColor,
        analysis: newAnalysis,
        entryMove: move,
      },
    ])
  }

  const returnToOriginal = () => setExplorationStack([])

  const nextMove = () => {
    if (isDiverged) return
    setCurrentIndex((prev) => Math.min(prev + 1, initialGame.totalMoves - 1))
  }

  const prevMove = () => {
    if (explorationStack.length > 0) {
      setExplorationStack((prev) => prev.slice(0, prev.length - 1))
      return
    }
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  return {
    moveNumber,
    totalMoves: initialGame.totalMoves,
    position,
    playerToMove,
    analysis,
    graph: initialGame.graph,
    isDiverged,
    explorationPath,
    goToMove,
    exploreMove,
    returnToOriginal,
    nextMove,
    prevMove,
  }
}
