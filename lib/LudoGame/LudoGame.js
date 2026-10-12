import {
  COLORS,
  SAFE_CELLS,
  GOAL_STEP,
  GAME_PHASES,
  PASS_REASONS,
} from './constants.js';
import Token from './Token.js';

export default class LudoGame {
  constructor(players = COLORS, startingColor = null) {
    if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
      throw new Error('Players must be an array of 2 to 4 colors.');
    }
    for (const color of players) {
      if (!COLORS.includes(color)) {
        throw new Error(`Invalid player color: ${color}. Allowed colors are ${COLORS.join(', ')}.`);
      }
    }
    const uniquePlayers = new Set(players);
    if (uniquePlayers.size !== players.length) {
      throw new Error('Player colors must be unique.');
    }

    this.players = [...players];
    const initialTurn = startingColor || this.players[0];
    if (!this.players.includes(initialTurn)) {
      throw new Error(`Starting color ${initialTurn} is not among the active players.`);
    }

    this.currentTurn = initialTurn;
    this.phase = GAME_PHASES.ROLL;
    this.currentDiceValue = null;
    this.eligibleTokens = [];
    this.rankings = [];
    this.consecutiveSixes = 0;

    this.tokens = [];
    for (const color of this.players) {
      for (let i = 0; i < 4; i++) {
        this.tokens.push(new Token(`${color}_${i}`, color, i));
      }
    }
  }

  get activePlayers() {
    return this.players.filter(color => !this.rankings.includes(color));
  }

  get isGameOver() {
    return this.phase === GAME_PHASES.GAME_OVER;
  }

  getTokensByColor(color) {
    return this.tokens.filter(token => token.color === color);
  }

  isPlayerFinished(color) {
    return this.getTokensByColor(color).every(token => token.isAtGoal);
  }

  getEligibleTokens(color, diceValue) {
    return this.getTokensByColor(color).filter(token => {
      if (token.isAtBase) {
        return diceValue === 6;
      }
      if (token.isAtGoal) {
        return false;
      }
      return token.step + diceValue <= GOAL_STEP;
    });
  }

  endTurn(hasExtraTurn = false) {
    this.currentDiceValue = null;
    this.eligibleTokens = [];

    if (hasExtraTurn && !this.isPlayerFinished(this.currentTurn) && !this.isGameOver) {
      this.phase = GAME_PHASES.ROLL;
      return;
    }

    this.consecutiveSixes = 0;

    if (this.activePlayers.length <= 1) {
      this.phase = GAME_PHASES.GAME_OVER;
      return;
    }

    const currentIndex = this.players.indexOf(this.currentTurn);
    for (let i = 1; i <= this.players.length; i++) {
      const nextColor = this.players[(currentIndex + i) % this.players.length];
      if (!this.rankings.includes(nextColor)) {
        this.currentTurn = nextColor;
        break;
      }
    }

    this.phase = GAME_PHASES.ROLL;
  }

  rollDice(value) {
    if (this.isGameOver) {
      throw new Error('Cannot roll dice: the game is over.');
    }
    if (this.phase !== GAME_PHASES.ROLL) {
      throw new Error(`Cannot roll dice in ${this.phase} phase.`);
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 6) {
      throw new Error('Dice value must be an integer between 1 and 6.');
    }

    if (value === 6) {
      this.consecutiveSixes += 1;
      if (this.consecutiveSixes === 3) {
        this.endTurn(false);
        return {
          turnPassed: true,
          passReason: PASS_REASONS.THREE_CONSECUTIVE_SIXES,
          eligibleTokens: [],
          autoMoved: false,
          moveResult: null,
        };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const eligible = this.getEligibleTokens(this.currentTurn, value);

    if (eligible.length === 0) {
      this.endTurn(false);
      return {
        turnPassed: true,
        passReason: PASS_REASONS.NO_ELIGIBLE_TOKENS,
        eligibleTokens: [],
        autoMoved: false,
        moveResult: null,
      };
    }

    this.currentDiceValue = value;
    this.eligibleTokens = eligible;

    if (eligible.length === 1) {
      const moveResult = this._executeMove(eligible[0]);
      return {
        turnPassed: false,
        passReason: null,
        eligibleTokens: eligible,
        autoMoved: true,
        moveResult,
      };
    }

    this.phase = GAME_PHASES.MOVE;
    return {
      turnPassed: false,
      passReason: null,
      eligibleTokens: eligible,
      autoMoved: false,
      moveResult: null,
    };
  }

  moveToken(token) {
    if (this.isGameOver) {
      throw new Error('Cannot move token: the game is over.');
    }
    if (this.phase !== GAME_PHASES.MOVE) {
      throw new Error(`Cannot move token in ${this.phase} phase.`);
    }

    if (!(token instanceof Token)) {
      throw new Error(`Invalid token: expected a Token instance, received ${token}.`);
    }
    if (token.color !== this.currentTurn) {
      throw new Error(`Token ${token.id} belongs to ${token.color}, but it is ${this.currentTurn}'s turn.`);
    }
    if (!this.eligibleTokens.includes(token)) {
      throw new Error(`Token ${token.id} is not eligible to move with dice roll of ${this.currentDiceValue}.`);
    }

    return this._executeMove(token);
  }

  _executeMove(token) {
    const fromStep = token.step;
    if (fromStep === -1) {
      token.step = 0;
    } else {
      token.step = fromStep + this.currentDiceValue;
    }

    const isGoal = token.isAtGoal;
    const capturedTokens = [];

    // Collision check on main track.
    if (token.trackCell !== null && !SAFE_CELLS.includes(token.trackCell)) {
      const opponents = this.tokens.filter(
        t => t.color !== this.currentTurn && t.trackCell === token.trackCell
      );
      for (const opponent of opponents) {
        opponent.step = -1;
        capturedTokens.push(opponent);
      }
    }

    let playerFinished = false;
    let finishRank = null;
    if (isGoal && this.isPlayerFinished(this.currentTurn)) {
      playerFinished = true;
      this.rankings.push(this.currentTurn);
      finishRank = this.rankings.length;
    }

    const hasExtraTurn = !playerFinished && (
      this.currentDiceValue === 6 ||
      capturedTokens.length > 0 ||
      isGoal
    );

    this.endTurn(hasExtraTurn);

    return {
      movedToken: token,
      fromStep,
      toStep: token.step,
      capturedTokens,
      isGoal,
      playerFinished,
      finishRank,
      hasExtraTurn,
      isGameOver: this.isGameOver,
    };
  }
}
