import { generateAnalysisForPosition } from './mockAnalysis'
import { generateMockGamePositions, totalMoves } from './mockGameData'
import type { GraphPoint, MockGameState } from '../types/game'

function classifyDelta(delta: number) {
  if (delta > 1) return 'blunder' as const
  if (delta > 0.3) return 'mistake' as const
  if (delta > 0.1) return 'inaccuracy' as const
  return 'normal' as const
}

export function buildMockGameState(): MockGameState {
  const positions = generateMockGamePositions()

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

  return { positions, analyses, graph, totalMoves }
}
