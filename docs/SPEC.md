# Chessy Specification Summary

**Date**: 2025-12-15
**Status**: Design Phase Complete, Ready for Architecture Review
**Branch**: `feature/lichess-integration`

---

## 30-Second Pitch

**Chessy** analyzes your Lichess games by showing:
1. **Six moves per position** - Your move + top 5 alternatives (with ranking)
2. **Graph + mistake clicking** - See your blunders at a glance, click to jump
3. **Interactive exploration** - Click to explore alternatives, see what would have happened
4. **LLM explanations** - Why each move makes sense (not just engine eval)
5. **One-click return** - Always get back to original game instantly

---

## The Core Innovation

**Not about showing "best moves" (everyone does this).**

**About showing "what you missed"** - ranked alternatives so you learn pattern recognition.

Plus: **Interactive exploration** where you can play out "what if" scenarios and see opponent's responses.

---

## User Experience Flow

### Normal Game Review
```
User opens game → Board shows move 15
↓
Sees: 1. Nf3 (0.8) | 2. Be2 (0.7) | 3. d3 (0.5) | 4. a3 (0.4) | 5. Qh5 (0.1, their move)
↓
Graph shows: whole game at glance, click mistake circle to jump
↓
Explanations: Why Nf3 works + Why Be2 works + Why their Qh5 doesn't
↓
Navigate < > through game normally
```

### Exploration Mode
```
User clicks arrow for Nf3 (the better move)
↓
⚠ Banner: "Diverged from game | [← Back to move 15]"
↓
Board updates: shows position after Nf3
↓
New analysis: "If you played Nf3, opponent's best replies are:"
↓
Shows Black's top 5 moves (re-analyzed)
↓
User can click to explore one move deeper OR click banner to return
↓
Click "[← Back to move 15]" → Everything resets to original
```

---

## Technical Components

### Frontend (Vite, not Next.js)

> Note: The initial implementation should use a **simple Vite app** (not Next.js) to keep things lightweight and fast for iteration.  
> The existing `front` folder should be kept (not removed), and necessary components can be copied over as needed to the new Vite app.
- **State Store**: Single source of truth via Zustand (board, graph, navigation, divergence path). All interactions (nav buttons, graph clicks, board move buttons, exploration) update the same store so board + graph stay in sync.
- **Board Component**: Use `react-chessboard`; show pieces + arrows only. Move labels live in a strip under the board (bigger tap targets). Arrows stay as visual hints; board itself is free of buttons.
- **Move Strip**: Below the board; larger pills for best moves + user move. No labels on board overlay.
- **Graph Component**: SVG evaluation curve + clickable mistake circles. Styling:
  - Minimal dark theme with a neutral light-gray evaluation line.
  - Constant-size dots: White moves are solid white, Black moves are solid near-black, all with a cool-gray outline.
  - Errors use outer rings (inaccuracy yellow thin, mistake orange medium, blunder red thick); optional culprit segments from (i-1 → i).
  - Current marker follows any action (graph click, board move, exploration).
  - Exploration: when diverged, show a secondary graph from the divergence point; main line after divergence fades to gray, secondary line stays highlighted.
- **Banner Component**: GitHub-style divergence notification
- **Explanation Component**: LLM-generated text + ranking info
- **State Management**: Track game line vs. exploration line
- **In-browser Stockfish (prototype-codex)**: WASM engine runs locally with a fixed time budget for fast feedback.

### Backend (Laravel)
- **Stockfish Integration**: Analyze top 5 moves per position
- **Caching Layer**: Store analysis by position hash (same position = same analysis)
- **LLM Integration**: Generate explanations for top moves + user's move
- **Lichess API**: Fetch games, OAuth, push notifications
- **Game Storage**: Save games with analysis

### Data Pipeline
```
1. Game is ideally auto-fetched from Lichess once a game finishes.
   - Investigate if Lichess API provides webhooks (for push fetch), or else poll for active games and increase polling frequency when a user is in a live game that may finish soon.
   - Upon completion: send push notification to user that analysis is starting.
   - When analysis is complete: send second push notification with analysis ready.
   ↓
2. Fetch game from Lichess API
   ↓
3. For each position in game:
   - Run Stockfish (analyze top 5 moves)
   - Rank the moves by evaluation
   - Generate LLM explanations for top 2 + user's move
   - Cache this data (position hash → analysis)
   ↓
4. Send to frontend with all pre-computed data
   ↓
5. When user explores alternative:
   - If that position was analyzed → use cached data
   - If new position → analyze on demand (can be lazy)
```

---

## Tech Stack & Libraries

- **Frontend**: Vite + React + TypeScript. Zustand for state. `chess.js` for FEN/move validation. `react-chessboard` for board rendering. SVG for graphs. Styling with CSS Modules.
- **Mock/data**: Local mock generators for positions/analyses (no network calls in prototype).
- **Backend**: Laravel, Stockfish, Lichess API, caching layer, LLM provider (optimized/cached).
- **Tooling**: TypeScript build via Vite/tsc, ESLint (if configured), npm scripts for dev/build.

## Iteration 3 (current updates)

- Graph visuals: minimal dark theme with a single neutral light-gray evaluation line and constant-size move dots. Dot fill encodes player only (White = solid white, Black = solid near-black). All dots use the same cool-gray outline purely for legibility; no size scaling by error magnitude. Errors are encoded with an outer ring around the dot (same dot size): inaccuracy = thin yellow ring, mistake = medium orange ring, blunder = thicker red ring. Rings are the loudest elements; line/grid/axes stay subdued. Optional culprit segment per error (i-1 -> i): directional gradient from severity hue at ~0.05 alpha into the error point at ~0.55 alpha, same or +1px stroke, rounded caps; fall back to solid muted segment (~0.45 alpha) if cluttered.
- Prototype UI: focus on just the board (with pendulum + move strip) and evaluation graph; hide top header, move status, explanation panel, navigation bar, and graph title/legend.
- Advantage pendulum: vertical indicator to the left of the chessboard that flows up/down based on the current evaluation.
- Move context: graph shows the played move label (colored like the opponent move in Lichess when applicable). Board shows the resulting position after that move, while the move strip lists the played move plus alternatives from the previous position; selecting an alternative replaces the played move instead of advancing to next moves.

## Iteration 4 (current decisions)

- Prototype target: `prototype-codex` is the first surface for live analysis wiring.
- In-browser Stockfish strategy: 500ms time cap with a small depth-grace window (up to +150ms) to reach the minimum depth target; returns MultiPV=5 (top 5 lines).
- Progressive refinement: show the first eval quickly, then improve as depth increases until the cap is reached.
- Navigation priority: cancel the current analysis immediately when the user moves to a new position.
- UX stability: avoid reordering already-shown moves; only append newly discovered alternatives to prevent flicker.
- Arrow colors: all arrows use a light transparent neutral; the made move is emphasized via blue square borders on from/to squares.
- Square highlight: show the last move made by the opponent (from/to squares), not the user's move.
- Graph evaluation: replace mock evals with single-PV Stockfish evals for every position. Graph updates progressively as new evals arrive.
- Analysis priority: MultiPV alternatives only for the current position; graph evals are computed in the background starting from the current move and fanning out.

## Iteration 2 (previous updates)

- Arbitrary exploration: drag any legal move on the board to explore; arrows are clickable to enter exploration.
- Arrow overlap/interaction: slight offsets and dashed second-best line to reduce overlap while keeping color semantics (green alternatives, orange user). Arrow clicks trigger the move; drag-to-move still allowed.
- Mobile layout tweaks: reduced padding/spacing at smaller widths, legend wraps, move strip stacks vertically on narrow screens, nav and banner adjust for touch, chessboard scales to container width.

## Implementation Details (frontend prototype)

- **State shape (Zustand)**: `{ moveNumber, totalMoves, positionFen, analysis, explorationPath[], isDiverged, graphData, goToMove(n), exploreMove(move), returnToOriginal(), nextMove(), prevMove() }`. All UI (board, graph, nav, move strip) reads/writes this store so a single action updates everything.
- **Board**: `react-chessboard` shows pieces + arrows only (no labels on the board). Arrows remain for visual hints. Labels move to a dedicated strip below the board with larger pill buttons for best moves + user move. Board stays clean.
- **Arbitrary exploration**: Disabled in the current iteration so the board focuses on the played move and its alternatives (no next-move suggestions).
- **Arrows interaction**: Board shows only the played-move arrow in the current position; alternatives live in the move strip.
- **Move strip**: Under the board. Pills for top 5 + user move; bigger tap targets; clicking invokes `exploreMove`.
- **Move strip (exploration)**: Always show the played move plus alternatives from the previous position; selecting an alternative replaces the played move (no next-move list).
- **Mobile layout**:
  - Reduce app padding and card spacing at ≤700px; tighten typography.
  - Move strip becomes a vertical list at ≤520px with full-width buttons for easy tapping.
  - Reduce graph height on small screens (≈170–190px).
  - Pendulum stacks above the board on narrow widths and shrinks slightly.
  - Chessboard scales to the available container width (no fixed minimum) to avoid zoomed/cropped board on small screens.
- **Graph (mainline)**:
  - Neutral light-gray line with constant-size dots; dot fill shows mover (White = white, Black = near-black), cool-gray outline for all dots.
  - Errors use outer rings: inaccuracy thin yellow, mistake medium orange, blunder thicker red; optional culprit segments with severity gradient (or solid muted when clustered).
  - Current marker is a subtle vertical line that follows any action (graph click, move strip, exploration). The played move label appears above the graph, colored for the opponent when applicable.
  - Graph clicks snap to the nearest move using SVG viewBox coordinates so responsive scaling does not shift selection.
- **Graph (exploration)**:
  - When diverged, render a secondary line starting at the divergence point.
  - Main line *after* the fork fades to gray (keep circle sizes; gray tint only after divergence).
  - Secondary line stays highlighted (same styling as mainline when no divergence); dots/rings apply to exploration moves.
  - Current marker tracks the active line (main or exploration) based on the store.
- **Navigation coherence**: Board arrows/strip clicks and graph clicks all dispatch to the store; the board position and both graphs update immediately from store state.
- **Exploration rules**: Enter divergence on alternative selection; graph click jumps to mainline and clears divergence; move strip always reflects the previous-position alternatives.
- **Data contracts**: Positions keyed by FEN; analyses carry `bestMoves` (top 5), `userMove`, and a `moves` list with SAN/uci/from/to/eval/rank/explanation. In prototype-codex, `moves` is MultiPV=5 plus the user move eval. Graph data carries moveNumber, evaluation, delta, and category (blunder/mistake/inaccuracy/normal).

## Design Files Created

| File | Purpose |
|------|---------|
| `docs/user-specs-raw.md` | Raw user input + clarifications |
| `docs/ui-wireframe-final.md` | Complete ASCII wireframes |
| `docs/ui-divergence-flow.md` | Interactive exploration flow (4-state example) |
| `docs/spec-analysis.md` | Critique + identified issues |
| `docs/research.md` | Competitive analysis |
| `docs/structure.md` | Project memory file |

---

## Clarifications (answerd)

Before starting architecture/implementation, need answers to:

1. **Arrow color scheme** - How to distinguish 3 arrows?
   - Answer: One color for the user's move, another color for the alternatives. We might also use solid lines for the user's move and dotted lines for alternatives to help colorblind users distinguish between them.

2. **Label placement** - Where do "1. 0.8" labels appear?
   - Preferably along the arrow itself, or near the arrow if there’s not enough space (e.g., pawn takes another pawn).

3. **Mistake threshold** - What counts as a "mistake circle" on graph?
   - Use the same categories as Lichess (e.g., blunder, mistake, inaccuracy).
   - The size of each circle corresponds to the size of the eval drop.
   - Apply to both players (with perhaps different colors and like filled circle vs unfilled circle)

4. **Analysis depth** - How many moves per position?
   - Prototype-codex uses top 5 (MultiPV=5); adjust later if needed.

5. **Navigation during exploration** - What should < > buttons do?
   - During exploration: 
      - The forward (>) button is disabled.
      - The backward (<) button allows stepping back to the previous move.

6. **Exploration depth limit** - How deep can user explore?
   - No hard limit—the user can explore as many moves ahead as they wish.
   - Position evaluations are performed lazily: when the user selects or makes a move during exploration, analysis for the resulting position kicks off on-demand (and gets cached).

7. **LLM Explanation Caching & Cost** 
   - Only make a request towards LLM if the user has actually opened certain position, no need to calculate it for all the 
   - Use optimised LLM - enough to give decent quality with maximum speed and low cost

---

## Architecture Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **LLM cost** | $$ per game if not cached | Cache by position hash, batch requests |
| **Stockfish performance** | Slow analysis delays UX | Pre-compute for all positions, cache aggressively |
| **Large exploration tree** | Exponential complexity | Limit depth to 2-3 moves |
| **Mobile graph clicks** | Tiny targets = bad UX | Use Fitts's law (bigger = worse moves), snap-to-nearest |
| **State complexity** | Exploration state gets messy | Separate "game line" state from "exploration line" cleanly |

---

## Key Design Principles Followed

- ✅ **Simple > Complex** - 3 arrows, not 25
- ✅ **All on one screen** - No tab switching, minimal scrolling
- ✅ **Mobile-first** - Vertical stacking works naturally
- ✅ **One-click anything** - Divergence return, mistake navigation
- ✅ **Visual hierarchy** - Ranking teaches without numbers
- ✅ **LLM explanations** - "Why it works" not "engine score is +0.8"
- ✅ **Fast feedback** - Pre-computed analysis, no live delays
- ✅ **Interactive** - Exploration feels natural, not academic

---

## Competitive Differentiation

| Feature | Chessy | DecodeChess | Lichess | Others |
|---------|--------|------------|---------|--------|
| Ranking system | ✅ | ❌ | ❌ | ❌ |
| Interactive exploration | ✅ | ❌ | ❌ | ❌ |
| GitHub-style divergence | ✅ | ❌ | ❌ | ❌ |
| LLM explanations | ✅ | ✅ | ❌ | Some |
| Mobile-first | ✅ | ❌ | ❌ | ❌ |
| Push notifications | ✅ | ❌ | ❌ | ❌ |
| Mistake graph (Fitts) | ✅ | ❌ | Partial | ❌ |

**Chessy wins on interaction design + learning pedagogy, not on engine analysis.**

---

## Files Updated in This Session

- Created: `docs/user-specs-raw.md`
- Created: `docs/ui-wireframe-final.md`
- Created: `docs/spec-analysis.md`
- Created: `docs/research.md`
- Created: `docs/structure.md`
- [reviewed] Created: `docs/SPEC.md` (this file)
- Updated: `docs/features/lichess-integration/progress.md`
