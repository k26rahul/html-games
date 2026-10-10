import {
  START_CELLS,
  TOTAL_TRACK_CELLS,
  MAX_TRACK_STEP,
  GOAL_STEP,
} from './constants.js';

export default class Token {
  constructor(id, color, index) {
    this.id = id;          // Unique identifier, e.g. 'red_0'.
    this.color = color;    // Player color: 'red', 'green', 'yellow', or 'blue'.
    this.index = index;    // Token slot index within its color group (0 to 3).
    this.step = -1;        // Relative position: -1 is base, 0 is start cell, 50 is track exit, 51-55 is home column, 56 is goal.
  }

  // Returns the absolute track cell number (1 to 52) when on the main track, or null otherwise.
  get trackCell() {
    if (this.step < 0 || this.step > MAX_TRACK_STEP) return null;
    const start = START_CELLS[this.color];
    return ((start - 1 + this.step) % TOTAL_TRACK_CELLS) + 1;
  }

  // Returns the home column cell number (1 to 5) when inside the home column, or null otherwise.
  get homeColumnCell() {
    if (!this.isAtHomeColumn) return null;
    return this.step - MAX_TRACK_STEP;
  }

  get isAtBase() {
    return this.step === -1;
  }

  get isAtGoal() {
    return this.step >= GOAL_STEP;
  }

  get isAtHomeColumn() {
    return this.step > MAX_TRACK_STEP && this.step < GOAL_STEP;
  }
}
