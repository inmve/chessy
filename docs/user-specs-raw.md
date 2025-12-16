# User Specifications - Raw Input

**Date**: 2025-12-15
**Session**: UI Design Requirements from Ivan

---

## Raw Transcript

"yeah, so i got the following in mind:

1. the chess board is on the top, it takes all the space (may be except for the top-bar with links and view preferences - ligh/dark theme)

the most important thing/change is in the chessboard - for a given position we are going to show with arrows the next pssible 1-2 alternative moves (ideally better ones than the one made by the user) AND the one that's going to be made by user. So 2-3 moves in total. Along with the arrow it will show the eval of the position that this move will bring to and possible the rank of the move among all the analysed alternatives ranked by the eval score. So it might lok like: 1. 0.8 2. 0.7 5. 0.1 where 5 is the rank of the move made by the user in the game and this move is ranked 5 in the all moves analysed for this position. in other words, the lower the rank, the better in this case.

2. under the board the graph showing the distribution of position eval during the game; [Image #1] - like how it's already implemented on lichess - the job of this diagram is to see the game in a glance and quickly navigate towards the moves where the mistakes were made (either mine or theirs); btw, let's note that the current graph can be improved by making a points on a graph where these mistakes were made in order to quickly click on them (fit's law) - perhaps even animate them slightly - like the worse the move, the bigger the mistake (put a circle on a graph)

3. then there should be < and > buttons to navigate to the move forward and backwards

4. and the cherry and possibly the most importnat part - explantions driven by llm! we are going to give simple explanation and short (down the line could be long, a setting) for all the moves shown on the board and perhaps even more - i don't like to overwhelm board with many moves, but as for text - it seems to be more flexible. Perhaps we can just provide explanations for whatever presented in the chess board, and just list the ones in between the made move and the first one. So for 3 and 4 in the example above we just name the moves."

---

## Critical Clarification (Follow-up)

**Interactive Move Exploration:**

The user is able to make moves throughout the game while analyzing. When the user makes a move that diverges from the actual game:

"the user is able to make moves throughout the game, and from the moment he makes a move, we start revaluate position with multiple possible moves. If the user's positiun starts to diverge from the game, it should show a github-like label: the position has been diverged, 'get back to original' with just one click"

**Key Points:**
- User can click arrows or interact with board to explore alternatives
- When user diverges from actual game move, analyze that diverged position
- Show GitHub-style divergence banner: "This position diverged from game. [Get back to original]"
- One-click return to actual game continuation

**Example Flow:**
1. Game: Move 15 White plays Qh5 (blunder)
2. Board shows alternatives: Nf3 (rank 1), Be2 (rank 2), Qh5 (rank 5, user's move)
3. User explores: clicks arrow for Nf3
4. Banner appears: "Diverged from game play [← Back to move 15]"
5. Board now shows: if Nf3 was played, what did opponent do? Show Black's best replies
6. User can keep exploring this line or click "Back to move 15" to return
7. When back: shows original Qh5, ready to continue or explore other alternatives

## Implicit Requirements

- Performance: Must handle move arrows + eval data + LLM explanations efficiently
- Visual clarity: 2-3 arrows on board shouldn't be confusing
- Mobile-first: Graph clickable points must work on touch
- Responsive: Works on different screen sizes
- **Interactive exploration**: Real-time re-analysis when user makes moves
- **Divergence tracking**: Clear indication of divergence from actual game
- **One-click return**: Simple navigation back to original game line
