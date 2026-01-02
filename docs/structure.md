# Chessy Project Structure & Memory

## Quick Reference

**Current Branch**: `feature/lichess-integration`
**Status**: Initialization phase
**Key Files**:
- Backend: `/Users/ivan/Code/chessy/back/` (Laravel)
- Frontend: `/Users/ivan/Code/chessy/front/` (Next.js)
- App: `/Users/ivan/Code/chessy/app/` (Mobile/Desktop)

## Project Purpose

**Chessy** is a chess game learning tool that:
1. Integrates with Lichess to pull your games
2. Runs Stockfish analysis on each position
3. Suggests 2-4 alternative moves with LLM explanations
4. Provides intuitive UI to explore alternative lines (like LeetCode but for chess)
5. Sends push notifications when you finish a game on Lichess

## Architecture Overview

### Backend (Laravel)
- API server handling Lichess integration
- Stockfish analysis coordination
- Database for games, analyses, user data
- Background job queue for async analysis
- Push notification system

### Frontend (Next.js)
- React-based web UI
- Game board visualization
- Alternative move exploration UI
- Lichess authentication
- Real-time game updates

### App Directory
- Separate mobile/desktop application
- Appears to have analysis and component modules
- Status: Unclear if this is active

## Key External Integrations

1. **Lichess API**
   - OAuth authentication
   - Game data fetching
   - Webhook support for game completion notifications

2. **Stockfish**
   - Chess engine for position analysis
   - Needs to be fast (lazy-loaded preferred)

3. **LLM** (Claude or similar)
   - Generate explanations for why moves work
   - Brief, focused explanations without move comparison

## UX Patterns to Implement

### Move Input
- **Problem**: Current letter-based clicking causes misclicks
- **Solution**: TBD - need to research better patterns (drag/drop, direct board interaction, etc.)

### Alternative Line Exploration
- Show 2-4 alternatives per move
- Expandable/overlay interface (TBD)
- Single move ahead on initial exploration
- Clear visual indication of divergence point
- One-click navigation back to main line

### Notification & Game Access
- Push notification when game finishes
- Recent games list in app
- "Sticky" experience (user naturally returns to app to check analysis)

## Development Guidelines

### Branching Strategy
- Create feature branches from `main` for all work
- Name format: `feature/<feature-name>` or `fix/<bug-name>`
- Never commit directly to main

### Before Creating/Updating PR
1. Run linting: `npm run lint` / `composer lint`
2. Run tests: `npm test` / `phpunit`
3. Update progress.md with detailed changes
4. Ensure all features complete before PR

### Code Standards
- Translation helpers for all UI strings
- Keep changes focused on the task
- No over-engineering or premature abstractions

## Immediate TODOs

1. **Research Phase**
   - [ ] Find existing chess analysis apps (Lichess.org built-in analysis, ChessDotCom, etc.)
   - [ ] Study their UX patterns
   - [ ] Check if anyone else does LLM + game analysis

2. **Design Phase**
   - [ ] Lichess API integration flow
   - [ ] Stockfish analysis pipeline
   - [ ] Alternative move selection algorithm
   - [ ] UI mockups for move exploration

3. **Implementation Phase**
   - [ ] Backend: Lichess API endpoints
   - [ ] Backend: Stockfish integration
   - [ ] Backend: LLM integration for explanations
   - [ ] Frontend: Game board component
   - [ ] Frontend: Alternative moves UI
   - [ ] Notifications system

## Notes for Next LLM Session

- User asked for "ultrathink" on whether similar apps exist
- Priority is UX - moves need to be intuitive and fast
- Analysis speed matters - users expect quick feedback
- The "divergence point" concept is key - must be immediately clear where alt line stems from main line
- Prototype-codex: UI is pared down to just the board + evaluation graph; graph uses a minimal dark theme with neutral line, player-only dot fills, error rings, and a played-move label; board shows the resulting position and the move strip focuses on alternatives from the previous position; vertical advantage pendulum sits to the left of the board.
