import { Chess } from 'chess.js'
import { ChessBoard } from './ChessBoard'
import { EvaluationGraph } from './EvaluationGraph'
import { MoveStrip } from './MoveStrip'
import { AdvantagePendulum } from './AdvantagePendulum'
import { buildExplorationGraph, useGameStore } from '../store/useGameStore'
import type { PlayerColor } from '../types/analysis'
import type { GamePosition } from '../types/game'
import styles from '../App.module.css'

const formatMoveLabel = (moveNumber: number, notation: string, playerColor: PlayerColor) => {
  const fullMove = Math.floor((moveNumber + 1) / 2)
  return playerColor === 'white' ? `${fullMove}. ${notation}` : `${fullMove}... ${notation}`
}

const resolveAfterMoveFen = (position?: GamePosition, fallbackFen?: string) => {
  if (!position) return fallbackFen ?? ''
  const chess = new Chess(position.fen)
  const result = chess.move({ from: position.from, to: position.to, promotion: 'q' })
  return result ? chess.fen() : position.fen
}

export function GameContainer() {
  const {
    currentIndex,
    positions,
    analyses,
    graph,
    exploration,
    userColor,
    goToMove,
    exploreMove,
    exploreMoveFromSquares,
  } = useGameStore((state) => ({
    currentIndex: state.currentIndex,
    positions: state.positions,
    analyses: state.analyses,
    graph: state.graph,
    exploration: state.exploration,
    userColor: state.userColor,
    goToMove: state.goToMove,
    exploreMove: state.exploreMove,
    exploreMoveFromSquares: state.exploreMoveFromSquares,
  }))

  const basePosition = positions[currentIndex]
  const baseAnalysis = analyses[currentIndex]
  const isDiverged = exploration.length > 0
  const activeNode = exploration[exploration.length - 1]
  const originAnalysis = isDiverged ? exploration[0]?.originAnalysis ?? baseAnalysis : baseAnalysis
  const currentMove = isDiverged && activeNode ? activeNode.entryMove : originAnalysis.userMove
  const moveNumber = activeNode?.moveNumber ?? basePosition?.moveNumber ?? 1
  const divergenceMoveNumber = isDiverged ? moveNumber : null
  const explorationGraph = isDiverged
    ? buildExplorationGraph(exploration, graph[currentIndex].evaluation)
    : []
  const graphCurrentMove = moveNumber
  const currentEvaluation = activeNode?.evaluation ?? graph[currentIndex]?.evaluation ?? 0

  const nextPosition = positions[currentIndex + 1]
  const afterMoveFen =
    nextPosition?.fen ?? resolveAfterMoveFen(basePosition, baseAnalysis?.position)
  const boardFen = activeNode ? activeNode.fen : afterMoveFen

  const moveColor = originAnalysis.playerToMove
  const currentMoveLabel =
    currentMove?.notation && moveNumber
      ? formatMoveLabel(moveNumber, currentMove.notation, moveColor)
      : undefined
  const currentMoveIsOpponent = moveColor !== userColor

  return (
    <div className={styles.gameShell}>
      <div className={styles.layout}>
        <div className={styles.boardArea}>
          <div className={styles.boardRow}>
            <AdvantagePendulum currentEvaluation={currentEvaluation} />
            <div className={styles.boardStack}>
              <ChessBoard
                fen={boardFen}
                bestMoves={originAnalysis.bestMoves}
                userMove={currentMove}
                onArbitraryMove={exploreMoveFromSquares}
                onArrowMove={exploreMove}
                showAlternatives={false}
                allowDragging={false}
              />
            </div>
          </div>
          <MoveStrip
            bestMoves={originAnalysis.bestMoves}
            userMove={currentMove}
            onMoveClick={exploreMove}
            showUserMove={true}
          />
        </div>
        <div className={styles.graphArea}>
          <EvaluationGraph
            mainLine={graph}
            explorationLine={explorationGraph}
            currentMove={graphCurrentMove}
            divergenceAt={divergenceMoveNumber ?? undefined}
            currentMoveLabel={currentMoveLabel}
            currentMoveIsOpponent={currentMoveIsOpponent}
            onSelectMove={goToMove}
          />
        </div>
      </div>
    </div>
  )
}
