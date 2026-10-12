import { GOAL_STEP } from './constants.js';
import Token from './Token.js';

export default class Player {
  constructor(id, colors) {
    this.id = id; // Unique identifier, e.g. 'A'.
    this.colors = [...colors]; // Colors this player owns (1 to 3).
    this.tokens = []; // Tokens of all owned colors, 4 per color.
    this.allianceId = null; // Id of the alliance this player belongs to. Assigned by the game.
    this.nextPlayer = null; // Next player in turn order, finished or not. Assigned by the game.
    this.rank = null; // Finishing rank starting at 1, or null while unranked.

    for (const color of this.colors) {
      for (let i = 0; i < 4; i++) {
        this.tokens.push(new Token(`${color}_${i}`, color, i, this));
      }
    }
  }

  // True when every owned token is at goal.
  get isFinished() {
    return this.tokens.every(token => token.isAtGoal);
  }

  // True if both players share an alliance. A player is allied with themselves.
  isAlliedWith(other) {
    return this.allianceId === other.allianceId;
  }

  getMovableTokens(diceValue) {
    return this.tokens.filter(token => {
      if (token.isAtBase) {
        return diceValue === 6;
      }
      if (token.isAtGoal) {
        return false;
      }
      return token.step + diceValue <= GOAL_STEP;
    });
  }
}
