export const COLORS = ['red', 'green', 'yellow', 'blue'];

// Starting cell index on the 52-cell track for each player color.
export const START_CELLS = {
  red: 2,
  green: 15,
  yellow: 28,
  blue: 41,
};

// Cells where tokens cannot be captured: 4 starting cells and 4 star cells.
export const SAFE_CELLS = [2, 10, 15, 23, 28, 36, 41, 49];

export const TOTAL_TRACK_CELLS = 52;

// Step 0 to 50 are on the shared 52-cell track (51 track cells total).
export const MAX_TRACK_STEP = 50;

// Steps 51 to 55 represent home column cells 1 to 5. Step 56 represents the goal.
export const GOAL_STEP = 56;

export const GAME_PHASES = {
  ROLL: 'ROLL',
  MOVE: 'MOVE',
  GAME_OVER: 'GAME_OVER',
};

export const PASS_REASONS = {
  NO_MOVABLE_TOKENS: 'NO_MOVABLE_TOKENS',
  THREE_CONSECUTIVE_SIXES: 'THREE_CONSECUTIVE_SIXES',
};
