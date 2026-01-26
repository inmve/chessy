export type EngineAnalysisKind = 'multipv' | 'user-move' | 'graph'

export interface EngineAnalysis {
  fen: string
  token: number
  kind: EngineAnalysisKind
  depth: number
  score: number // centipawns
  mate?: number
  pv: string // raw string of moves
  multipv: number
  moveUci?: string
}

type AnalysisCallback = (analysis: EngineAnalysis) => void
export interface EngineDone {
  fen: string
  token: number
  kind: EngineAnalysisKind
  maxDepth: number
  moveUci?: string
}

type DoneCallback = (analysis: EngineDone) => void

interface AnalyzeOptions {
  fen: string
  multipv?: number
  timeMs?: number
  minDepth?: number
  kind?: EngineAnalysisKind
  moveUci?: string
}

export class StockfishEngine {
  private worker: Worker | null = null
  private onAnalysis: AnalysisCallback | null = null
  private onDone: DoneCallback | null = null
  private currentToken = 0
  private currentFen: string | null = null
  private currentKind: EngineAnalysisKind = 'multipv'
  private currentMoveUci?: string
  private minDepth = 12
  private maxDepth = 0
  private lastDepthByMultiPv = new Map<number, number>()
  private stopTimer: number | null = null
  private hardStopTimer: number | null = null
  private pendingStop = false

  constructor() {
    // We assume stockfish.wasm.js is available at the root (public folder)
    this.worker = new Worker('/stockfish.wasm.js')
    this.worker.onmessage = (e) => this.handleMessage(e.data)
    this.worker.postMessage('uci')
  }

  private handleMessage(msg: string) {
    // console.log('SF:', msg)
    if (msg.startsWith('bestmove')) {
      if (this.onDone && this.currentFen) {
        this.onDone({
          fen: this.currentFen,
          token: this.currentToken,
          kind: this.currentKind,
          maxDepth: this.maxDepth,
          moveUci: this.currentMoveUci,
        })
      }
      return
    }
    if (msg.startsWith('info') && msg.includes('score') && msg.includes('pv')) {
      this.parseInfo(msg)
    }
  }

  private parseInfo(msg: string) {
    if (!this.onAnalysis || !this.currentFen) return

    // Example: info depth 10 ... multipv 1 score cp 52 ... pv e2e4 c7c5
    const depthMatch = msg.match(/depth (\d+)/)
    const multipvMatch = msg.match(/multipv (\d+)/)
    const scoreCpMatch = msg.match(/score cp (-?\d+)/)
    const scoreMateMatch = msg.match(/score mate (-?\d+)/)
    const pvIndex = msg.indexOf(' pv ')
    
    if (depthMatch && (scoreCpMatch || scoreMateMatch) && pvIndex !== -1) {
      const depth = parseInt(depthMatch[1], 10)
      const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1
      const lastDepth = this.lastDepthByMultiPv.get(multipv) ?? 0
      if (depth < lastDepth) return
      this.lastDepthByMultiPv.set(multipv, depth)
      this.maxDepth = Math.max(this.maxDepth, depth)
      if (this.pendingStop && this.maxDepth >= this.minDepth) {
        this.stop()
      }
      const pv = msg.substring(pvIndex + 4).trim()
      
      const analysis: EngineAnalysis = {
        fen: this.currentFen,
        token: this.currentToken,
        kind: this.currentKind,
        depth,
        score: scoreCpMatch ? parseInt(scoreCpMatch[1], 10) / 100 : 0,
        mate: scoreMateMatch ? parseInt(scoreMateMatch[1], 10) : undefined,
        pv,
        multipv,
        moveUci: this.currentMoveUci,
      }
      
      this.onAnalysis(analysis)
    }
  }

  public setCallback(cb: AnalysisCallback) {
    this.onAnalysis = cb
  }

  public setDoneCallback(cb: DoneCallback) {
    this.onDone = cb
  }

  public analyze({
    fen,
    multipv = 5,
    timeMs = 500,
    minDepth = 12,
    kind = 'multipv',
    moveUci,
  }: AnalyzeOptions) {
    if (!this.worker) return
    this.cancel()
    this.currentToken += 1
    this.currentFen = fen
    this.currentKind = kind
    this.currentMoveUci = moveUci
    this.minDepth = minDepth
    this.maxDepth = 0
    this.lastDepthByMultiPv.clear()
    this.pendingStop = false

    this.worker.postMessage('ucinewgame')
    this.worker.postMessage(`setoption name MultiPV value ${multipv}`)
    if (kind === 'user-move' && moveUci) {
      this.worker.postMessage(`position fen ${fen} moves ${moveUci}`)
    } else {
      this.worker.postMessage(`position fen ${fen}`)
    }
    this.worker.postMessage('go infinite')

    this.stopTimer = window.setTimeout(() => {
      if (this.maxDepth >= this.minDepth) {
        this.stop()
      } else {
        this.pendingStop = true
      }
    }, timeMs)
    this.hardStopTimer = window.setTimeout(() => {
      this.stop()
    }, timeMs + 150)
    return this.currentToken
  }

  public stop() {
    if (!this.worker) return
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (this.hardStopTimer) {
      window.clearTimeout(this.hardStopTimer)
      this.hardStopTimer = null
    }
    this.pendingStop = false
    this.worker.postMessage('stop')
  }

  public cancel() {
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (this.hardStopTimer) {
      window.clearTimeout(this.hardStopTimer)
      this.hardStopTimer = null
    }
    this.pendingStop = false
    this.worker?.postMessage('stop')
  }

  public quit() {
    this.cancel()
    this.worker?.postMessage('quit')
    this.worker?.terminate()
    this.worker = null
  }
}

export const stockfish = new StockfishEngine()
