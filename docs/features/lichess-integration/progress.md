# Lichess Integration & Game Analysis Feature

**Last Updated**: 2025-12-16
**Status**: Prototype Built - Ready for Testing
**Completion**: 35%

---

## Vision

A learning tool for analyzing personal chess games with seamless Lichess integration. Users can explore their games with AI-powered alternative move suggestions and LLM explanations, designed to be as intuitive as LeetCode but tailored for chess analysis.

### Core Pillars
1. **Lichess Integration** - Push notifications on finished games, easy access to recent games
2. **Move Analysis** - Stockfish analysis with 2-4 alternative moves per user move
3. **LLM Explanations** - Brief explanations of why alternative moves make sense (no comparisons)
4. **Line Exploration** - Easy, intuitive navigation through alternative lines with clear divergence points
5. **Better Move Input** - Replace cumbersome letter-based move clicking

---

## Project Architecture

### Tech Stack
- **Backend**: Laravel PHP (in `back/`)
- **Frontend**: Next.js React (in `front/`)
- **App**: Separate app directory for mobile/desktop (in `app/`)
- **Analysis Engine**: Stockfish (to be integrated)
- **LLM**: For move explanations
- **External**: Lichess API for game data & notifications

### Directory Structure
```
chessy/
├── back/           # Laravel API backend
├── front/          # Next.js web frontend
├── app/            # Mobile/desktop app
│   ├── analysis/   # Game analysis components
│   └── components/ # Reusable UI components
└── docs/
    └── features/
        └── lichess-integration/
            └── progress.md (this file)
```

---

## Timeline

- **2025-12-15**: Project initialization, feature branch created, progress structure setup

---

## Decisions

### Decision 1: Feature Branch Naming
- **Context**: Organizing work on main feature set
- **Choice**: `feature/lichess-integration` - covers the core feature set: Lichess integration + game analysis
- **Impact**: All related work (notifications, move analysis, UI exploration) tracked under this branch

---

## Current Status

### What's Happening Now
- Setting up progress tracking infrastructure
- Planning Lichess integration approach
- Researching existing similar applications

### What's Working
- Basic project structure in place (Laravel backend, Next.js frontend, app directory)
- Git initialized with initial commit

### What's Not Working / Incomplete
- No Lichess API integration
- No Stockfish analysis pipeline
- No LLM explanation system
- No notification system
- Move input UI needs redesign
- Alternative line exploration UI not implemented
- No progress tracking in place (being set up now)

## Design Specification (Current - UPDATED)

**Core UI Layout:**
1. **Chess Board** (top) - Shows 2-3 move arrows with eval + ranking
   - Best alternative 1 (highest eval)
   - Best alternative 2 (second highest)
   - User's actual move (often ranked lower, showing missed opportunity)
   - Format: Arrows labeled "1. 0.8", "2. 0.7", "5. 0.1" (rank + eval)
   - **User can click arrows to explore alternatives**

2. **Evaluation Graph** (middle) - Lichess-style curve + clickable mistake points
   - Line shows eval throughout game
   - Circles indicate mistakes (size = severity, per Fitts's law)
   - Click circle → jump to that move instantly

3. **Navigation** (below graph) - Simple < > buttons + "Move X of Y"

4. **LLM Explanations** (bottom) - Tiered detail strategy
   - Full explanations: Top 2 alternatives + user's move
   - Names only: Moves ranked 3-4 and in-between
   - Expandable: Click to reveal full explanation

5. **Divergence Mode** (NEW) - Interactive move exploration
   - User clicks arrow to explore hypothetical line
   - GitHub-style banner appears: "Diverged from game | [← Back to move X]"
   - Board updates to show explored position
   - Shows opponent's best replies (re-analyzed)
   - User can explore 2-3 moves deep
   - One click to return to original game line
   - Graph stays on original game line (never changes during exploration)

**Key Insight**: Shows "what you missed" (ranking) + ability to explore hypothetical lines interactively

### What's Next (Immediate)
1. ✅ Research existing apps/tools - DONE
2. ✅ Design UI mockups - DONE (ASCII wireframes + analysis)
3. ✅ Add interactive divergence mode - DONE (GitHub-style exploration)
4. ⏳ **Clarify remaining spec questions** (pending user confirmation):
   - Arrow color coding scheme?
   - Label placement (destination square? sidebar?)
   - Graph circle threshold for mistakes?
   - Ranking total (analyze top 10? 20? 40 moves per position?)
   - Navigation behavior while exploring: [<] and [>] buttons?
   - Depth limit: How many moves ahead can user explore? (suggest 2-3)
5. Design Lichess API integration flow
6. Plan Stockfish analysis pipeline
7. Set up backend API structure

---

## Research Findings

### Existing Market Solutions
- **DecodeChess**: Stockfish + LLM explanations (proven approach)
- **Chessplain**: AI analysis with freemium model
- **SimplifyChess**: Lichess import with AI breakdowns
- **Lichess Commentary App**: LLM + Stockfish integration (validates our tech stack)
- **Maia Chess**: Human-like move suggestions (different approach)

### Competitive Advantages
✅ All technical components are proven to work
❌ **No app yet does intuitive alternative line exploration with divergence points** (KEY DIFFERENTIATOR)
❌ **No app prioritizes better move input** (SOLVE THE MISCLICK PROBLEM)
❌ **No app emphasizes mobile-first with notifications** (STICKY APP EXPERIENCE)

### Strategic Insight
The market has LLM+Stockfish solutions. Chessy wins on:
1. **UX** - exploration-first, not analysis-first
2. **Interaction** - solve letter-clicking clumsiness
3. **Engagement** - push notifications drive repeated use
4. **Learning focus** - "why it works" not "why it's best"

## Challenges & Solutions

*To be updated as work progresses*

---

## Files Modified

### Created
- `docs/features/lichess-integration/progress.md` - Progress tracking file
- `docs/structure.md` - Project structure memory file
- `docs/research.md` - Competitive analysis and market research

### Modified
- *None yet*

---

## Next Steps

- [ ] Research existing chess game analysis apps
- [ ] Research LeetCode-style UI patterns for chess
- [ ] Plan Lichess API integration (OAuth, webhooks, API calls)
- [ ] Design Stockfish analysis pipeline (timing, caching, performance)
- [ ] Design move input interaction patterns
- [ ] Design alternative line exploration UI
- [ ] Set up backend Lichess integration endpoints
- [ ] Implement push notification system
- [ ] Build game analysis data structures

---

## Technical Considerations

### Performance
- Stockfish analysis must be "quite fast" - consider:
  - Lazy loading of analysis
  - Caching analyzed positions
  - Running analysis async in background jobs
  - Limiting analysis depth for speed

### UX for Alternative Lines
- Overlay or expandable UI for alternatives (to be decided)
- Must show why each move makes sense
- Single move ahead on first exploration
- Clear "divergence point" visualization
- Easy navigation back to main line

### Move Input
- Current approach: letter-based clicking is cumbersome and causes misclicks
- Need better interaction pattern (drag & drop? swipe? direct board manipulation?)
