# Chessy Specification Summary

**Date**: 2025-12-15
**Status**: Design Phase Complete, Ready for Architecture Review
**Branch**: `feature/lichess-integration`

---

## 30-Second Pitch

**Chessy** analyzes your Lichess games by showing:
1. **Three moves per position** - Your move + top 2 better alternatives (with ranking)
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
Sees: 1. Nf3 (0.8) | 2. Be2 (0.7) | 5. Qh5 (0.1, their move)
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
Shows Black's top 2-3 moves (re-analyzed)
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
- **Board Component**: Show chess position + 3 arrows with labels
- **Graph Component**: SVG evaluation curve + clickable mistake circles
- **Banner Component**: GitHub-style divergence notification
- **Explanation Component**: LLM-generated text + ranking info
- **State Management**: Track game line vs. exploration line

### Backend (Laravel)
- **Stockfish Integration**: Analyze top 5-10 moves per position
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
   - Run Stockfish (analyze top 10 moves)
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
   - Let's start by matching whatever number of moves Lichess currently provides in their analysis (probably top 10), and adjust later if needed.

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
