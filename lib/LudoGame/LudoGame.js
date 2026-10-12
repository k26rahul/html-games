import { COLORS, SAFE_CELLS, GOAL_STEP, GAME_PHASES, PASS_REASONS } from './constants.js';
import Player from './Player.js';
import Token from './Token.js';

// Shorthand form: an array of colors, each color is its own single-color player.
function normalizeConfig(config) {
  if (Array.isArray(config)) {
    if (config.length < 2 || config.length > 4) {
      throw new Error('Players must be an array of 2 to 4 colors.');
    }
    for (const color of config) {
      if (!COLORS.includes(color)) {
        throw new Error(
          `Invalid player color: ${color}. Allowed colors are ${COLORS.join(', ')}.`,
        );
      }
    }
    if (new Set(config).size !== config.length) {
      throw new Error('Player colors must be unique.');
    }
    return {
      players: config.map(color => ({ id: color, colors: [color] })),
      alliances: [],
    };
  }

  if (config === null || typeof config !== 'object') {
    throw new Error(
      'Config must be an array of colors or an object with players and alliances.',
    );
  }
  return { players: config.players, alliances: config.alliances ?? [] };
}

function validatePlayers(players) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
    throw new Error('Players must be an array of 2 to 4 player definitions.');
  }

  const seenPlayerIds = new Set();
  const seenColors = new Set();
  for (const player of players) {
    if (player === null || typeof player !== 'object') {
      throw new Error('Each player must be an object with an id and colors.');
    }
    const { id: playerId, colors } = player;
    if (typeof playerId !== 'string' || playerId.length === 0) {
      throw new Error('Player id must be a non-empty string.');
    }
    if (seenPlayerIds.has(playerId)) {
      throw new Error(`Duplicate player id: ${playerId}.`);
    }
    seenPlayerIds.add(playerId);

    if (!Array.isArray(colors) || colors.length < 1 || colors.length > 3) {
      throw new Error(`Player ${playerId} must own 1 to 3 colors.`);
    }
    for (const color of colors) {
      if (!COLORS.includes(color)) {
        throw new Error(
          `Invalid color for player ${playerId}: ${color}. Allowed colors are ${COLORS.join(', ')}.`,
        );
      }
      if (seenColors.has(color)) {
        throw new Error(`Color ${color} is owned by more than one player.`);
      }
      seenColors.add(color);
    }
  }
}

function validateAlliances(alliances, playerIds) {
  if (!Array.isArray(alliances)) {
    throw new Error('Alliances must be an array of player id arrays.');
  }

  const knownPlayerIds = new Set(playerIds);
  const allied = new Set();
  for (const alliance of alliances) {
    if (!Array.isArray(alliance) || alliance.length < 2) {
      throw new Error('Each alliance must be an array of at least 2 player ids.');
    }
    for (const playerId of alliance) {
      if (!knownPlayerIds.has(playerId)) {
        throw new Error(`Alliance references unknown player id: ${playerId}.`);
      }
      if (allied.has(playerId)) {
        throw new Error(`Player ${playerId} cannot belong to more than one alliance.`);
      }
      allied.add(playerId);
    }
    // An alliance of every player would leave no opponents to capture.
    if (new Set(alliance).size === playerIds.length) {
      throw new Error('An alliance cannot include all players.');
    }
  }
}

export default class LudoGame {
  /**
   * @param {string[] | {
   *   players: { id: string, colors: string[] }[],
   *   alliances?: string[][]
   * }} config Shorthand color array, or players with owned colors and optional alliances.
   */
  constructor(config = COLORS) {
    const { players, alliances } = normalizeConfig(config);
    validatePlayers(players);
    validateAlliances(
      alliances,
      players.map(p => p.id),
    );

    // Players in turn order.
    this.players = players.map(p => new Player(p.id, p.colors));
    // Declared alliances as arrays of player ids. Allied tokens never capture each other.
    this.alliances = alliances.map(a => [...a]);
    // Player whose turn it is.
    this.currentPlayer = this.players[0];
    // Current phase: ROLL, MOVE or GAME_OVER.
    this.phase = GAME_PHASES.ROLL;
    // Last accepted dice value, or null when no move is pending.
    this.currentDiceValue = null;
    // Tokens the current player may move with the current dice value.
    this.movableTokens = [];
    // Consecutive sixes rolled by the current player in the current turn chain.
    this.consecutiveSixes = 0;

    this._populateAllianceIds();
    this._linkPlayers();
  }

  // All tokens of all players.
  get tokens() {
    return this.players.flatMap(player => player.tokens);
  }

  // Ranked players in finishing order. The last player is ranked when the game ends.
  get rankings() {
    return this.players
      .filter(player => player.rank !== null)
      .sort((a, b) => a.rank - b.rank);
  }

  // Players who have not finished yet, in turn order.
  get activePlayers() {
    return this.players.filter(player => !player.isFinished);
  }

  get isGameOver() {
    return this.phase === GAME_PHASES.GAME_OVER;
  }

  _populateAllianceIds() {
    let nextAllianceId = 0;
    for (const alliance of this.alliances) {
      for (const playerId of alliance) {
        this.getPlayer(playerId).allianceId = nextAllianceId;
      }
      nextAllianceId++;
    }
    // Players outside any declared alliance form an alliance of their own.
    for (const player of this.players) {
      if (player.allianceId === null) {
        player.allianceId = nextAllianceId++;
      }
    }
  }

  _linkPlayers() {
    this.players.forEach((player, i) => {
      player.nextPlayer = this.players[(i + 1) % this.players.length];
    });
  }

  getPlayer(playerId) {
    return this.players.find(player => player.id === playerId) ?? null;
  }

  getTokensByColor(color) {
    return this.tokens.filter(token => token.color === color);
  }

  endTurn(hasExtraTurn = false) {
    this.currentDiceValue = null;
    this.movableTokens = [];

    if (hasExtraTurn && !this.currentPlayer.isFinished && !this.isGameOver) {
      this.phase = GAME_PHASES.ROLL;
      return;
    }

    const active = this.activePlayers;
    if (active.length <= 1) {
      // Rank the last remaining player so every player has a rank.
      for (const player of active) {
        this._assignRank(player);
      }
      this.phase = GAME_PHASES.GAME_OVER;
      return;
    }

    this.currentPlayer = this._getNextActivePlayer();
    this.consecutiveSixes = 0;
    this.phase = GAME_PHASES.ROLL;
  }

  _getNextActivePlayer() {
    let next = this.currentPlayer.nextPlayer;
    while (next.isFinished) {
      next = next.nextPlayer;
    }
    return next;
  }

  _assignRank(player) {
    player.rank = this.rankings.length + 1;
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

    const player = this.currentPlayer;

    if (value === 6) {
      this.consecutiveSixes += 1;
      if (this.consecutiveSixes === 3) {
        this.consecutiveSixes = 0;
        this.endTurn(false);
        return {
          player,
          playerId: player.id,
          turnPassed: true,
          passReason: PASS_REASONS.THREE_CONSECUTIVE_SIXES,
          movableTokens: [],
        };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const movable = player.getMovableTokens(value);

    if (movable.length === 0) {
      this.consecutiveSixes = 0;
      this.endTurn(false);
      return {
        player,
        playerId: player.id,
        turnPassed: true,
        passReason: PASS_REASONS.NO_MOVABLE_TOKENS,
        movableTokens: [],
      };
    }

    this.currentDiceValue = value;
    this.movableTokens = movable;
    this.phase = GAME_PHASES.MOVE;

    return {
      player,
      playerId: player.id,
      turnPassed: false,
      passReason: null,
      movableTokens: movable,
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
    if (!this.movableTokens.includes(token)) {
      throw new Error(
        `Token ${token.id} is not movable with dice roll of ${this.currentDiceValue}.`,
      );
    }

    const player = this.currentPlayer;
    const fromStep = token.step;
    if (fromStep === -1) {
      token.step = 0;
    } else {
      token.step = fromStep + this.currentDiceValue;
    }

    const isGoal = token.isAtGoal;
    const capturedTokens = [];

    // Capture tokens of other alliances sharing this track cell.
    if (token.trackCell !== null && !SAFE_CELLS.includes(token.trackCell)) {
      const opponents = this.tokens.filter(
        t => t.trackCell === token.trackCell && !player.isAlliedWith(t.owner),
      );
      for (const opponent of opponents) {
        opponent.step = -1;
        capturedTokens.push(opponent);
      }
    }

    let playerFinished = false;
    let finishRank = null;
    if (isGoal && player.isFinished) {
      playerFinished = true;
      this._assignRank(player);
      finishRank = player.rank;
    }

    const hasExtraTurn =
      !playerFinished &&
      (this.currentDiceValue === 6 || capturedTokens.length > 0 || isGoal);

    this.endTurn(hasExtraTurn);

    return {
      player,
      playerId: player.id,
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

  // Returns the full game state as plain JSON-safe data.
  serialize() {
    const tokenSteps = {};
    for (const token of this.tokens) {
      tokenSteps[token.id] = token.step;
    }
    return {
      players: this.players.map(p => ({ id: p.id, colors: [...p.colors] })),
      alliances: this.alliances.map(a => [...a]),
      currentPlayerId: this.currentPlayer.id,
      phase: this.phase,
      currentDiceValue: this.currentDiceValue,
      consecutiveSixes: this.consecutiveSixes,
      rankings: this.rankings.map(p => p.id),
      tokenSteps,
    };
  }

  // Rebuilds a game from the output of serialize(). Throws if the state is invalid.
  static deserialize(state) {
    if (state === null || typeof state !== 'object') {
      throw new Error('State must be an object.');
    }
    const game = new LudoGame({ players: state.players, alliances: state.alliances });
    game._restore(state);
    return game;
  }

  _restore(state) {
    const {
      currentPlayerId,
      phase,
      currentDiceValue,
      consecutiveSixes,
      rankings,
      tokenSteps,
    } = state;

    if (!Object.values(GAME_PHASES).includes(phase)) {
      throw new Error(`Invalid phase: ${phase}.`);
    }
    const currentPlayer = this.getPlayer(currentPlayerId);
    if (currentPlayer === null) {
      throw new Error(`Unknown current player id: ${currentPlayerId}.`);
    }
    if (
      !Number.isInteger(consecutiveSixes) ||
      consecutiveSixes < 0 ||
      consecutiveSixes > 2
    ) {
      throw new Error('Consecutive sixes must be an integer from 0 to 2.');
    }

    // Token positions.
    const tokens = this.tokens;
    if (
      tokenSteps === null ||
      typeof tokenSteps !== 'object' ||
      Object.keys(tokenSteps).length !== tokens.length
    ) {
      throw new Error('Token steps must contain exactly one entry per token.');
    }
    for (const token of tokens) {
      const step = tokenSteps[token.id];
      if (!Number.isInteger(step) || step < -1 || step > GOAL_STEP) {
        throw new Error(`Invalid step for token ${token.id}: ${step}.`);
      }
      token.step = step;
    }

    // Rankings: every ranked player must be finished, except the last player when the game is over.
    if (!Array.isArray(rankings) || new Set(rankings).size !== rankings.length) {
      throw new Error('Rankings must be an array of unique player ids.');
    }
    const gameOver = phase === GAME_PHASES.GAME_OVER;
    const maxRanked = gameOver ? this.players.length : this.players.length - 2;
    if (gameOver ? rankings.length !== maxRanked : rankings.length > maxRanked) {
      throw new Error('Rankings length is inconsistent with the game phase.');
    }
    rankings.forEach((playerId, i) => {
      const player = this.getPlayer(playerId);
      if (player === null) {
        throw new Error(`Unknown player id in rankings: ${playerId}.`);
      }
      if (!player.isFinished && !(gameOver && i === this.players.length - 1)) {
        throw new Error(`Player ${playerId} is ranked but has unfinished tokens.`);
      }
      player.rank = i + 1;
    });
    if (!gameOver) {
      if (currentPlayer.isFinished) {
        throw new Error(
          'Current player cannot be finished while the game is in progress.',
        );
      }
      if (this.players.some(p => p.isFinished && p.rank === null)) {
        throw new Error('Every finished player must be ranked.');
      }
    }

    // Turn state. Movable tokens are derived from the dice value.
    if (phase === GAME_PHASES.MOVE) {
      if (
        !Number.isInteger(currentDiceValue) ||
        currentDiceValue < 1 ||
        currentDiceValue > 6
      ) {
        throw new Error('MOVE phase requires a dice value from 1 to 6.');
      }
      const movable = currentPlayer.getMovableTokens(currentDiceValue);
      if (movable.length === 0) {
        throw new Error('MOVE phase requires at least one movable token.');
      }
      this.movableTokens = movable;
      this.currentDiceValue = currentDiceValue;
    } else if (currentDiceValue !== null) {
      throw new Error(`Dice value must be null in ${phase} phase.`);
    }

    this.currentPlayer = currentPlayer;
    this.phase = phase;
    this.consecutiveSixes = consecutiveSixes;
  }
}
