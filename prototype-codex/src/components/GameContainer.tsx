import { useEffect } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard } from './ChessBoard'
import { EvaluationGraph } from './EvaluationGraph'
import { MoveStrip } from './MoveStrip'
import { AdvantagePendulum } from './AdvantagePendulum'
import { buildExplorationGraph, useGameStore } from '../store/useGameStore'
import type { PlayerColor } from '../types/analysis'
import type { GamePosition } from '../types/game'
import styles from '../App.module.css'

import { ImportGame } from './ImportGame'

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
    nextMove,
    prevMove,
    exploreMove,
    exploreMoveFromSquares,
    startAnalysis,
    scheduleGraphAnalysis,
  } = useGameStore((state) => ({
    currentIndex: state.currentIndex,
    positions: state.positions,
    analyses: state.analyses,
    graph: state.graph,
    exploration: state.exploration,
    userColor: state.userColor,
    goToMove: state.goToMove,
    nextMove: state.nextMove,
    prevMove: state.prevMove,
    exploreMove: state.exploreMove,
    exploreMoveFromSquares: state.exploreMoveFromSquares,
    startAnalysis: state.startAnalysis,
    scheduleGraphAnalysis: state.scheduleGraphAnalysis,
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
  const mainlineHighlight =
    basePosition && basePosition.playerColor !== userColor
      ? { from: basePosition.from, to: basePosition.to }
      : null
  const explorationHighlight =
    activeNode && activeNode.playerToMove === userColor
      ? { from: activeNode.entryMove.from, to: activeNode.entryMove.to }
      : null
  const highlightedMove = isDiverged ? explorationHighlight : mainlineHighlight

  // Determine the analysis to show on the board (arrows for the *resulting* position)
  // If exploring, use the active node's analysis (responses to the exploration move)
  // If main line, use the *next* position's analysis (responses to the played move)
  const nextAnalysis = analyses[currentIndex + 1]
  const boardAnalysis = activeNode ? activeNode.analysis : nextAnalysis
  
  // If we are at the end of known data or just calculated a state without analysis, fallbacks:
  const boardBestMoves = boardAnalysis?.bestMoves ?? []
  // For userMove on the board, we show the *next* move that was played/will be played
  // If no next move known, we pass a dummy or undefined (ChessBoard handles it?)
  // Actually ChessBoard expects `userMove` for the arrow. If null, we might need a dummy.
  // But `userMove` in analysis is the move *from* that position. 
  const boardNextMove = boardAnalysis?.userMove ?? { from: '', to: '', notation: '', evaluation: 0, rank: 0, explanation: '' }

  const analysisFen = boardAnalysis?.position

  useEffect(() => {
    if (!analysisFen) return
    startAnalysis(analysisFen)
  }, [analysisFen, startAnalysis])

  useEffect(() => {
    scheduleGraphAnalysis(currentIndex)
  }, [currentIndex, scheduleGraphAnalysis])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextMove()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prevMove()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nextMove, prevMove])

  return (
    <div className={styles.gameShell}>
      <div className={styles.layout}>
        <div className={styles.boardArea}>
          <div className={styles.boardRow}>
            <AdvantagePendulum currentEvaluation={currentEvaluation} />
            <div className={styles.boardStack}>
              <ChessBoard
                fen={boardFen}
                bestMoves={boardBestMoves}
                userMove={boardNextMove}
                highlightedMove={highlightedMove}
                onArbitraryMove={exploreMoveFromSquares}
                onArrowMove={exploreMove}
                showAlternatives={true}
                allowDragging={false}
              />
            </div>
            <MoveStrip
              bestMoves={boardBestMoves}
              userMove={boardNextMove}
              onMoveClick={(move) => {
                // If not exploring and the move matches the next main line move, just advance
                if (!isDiverged && nextPosition && move.from === nextPosition.from && move.to === nextPosition.to) {
                  nextMove()
                  return
                }
                exploreMove(move)
              }}
              showUserMove={true}
            />
          </div>
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
      <ImportGame />
    </div>
  )
}
