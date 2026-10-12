import { COLORS, SAFE_CELLS, GOAL_STEP, GAME_PHASES, PASS_REASONS } from './constants.js';
import Token from './Token.js';

// Maps each player id to the id of the next player in turn order.
function buildNextPlayerMap(playerIds) {
  const map = {};
  for (let i = 0; i < playerIds.length; i++) {
    map[playerIds[i]] = playerIds[(i + 1) % playerIds.length];
  }
  return map;
}

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

  const seenIds = new Set();
  const seenColors = new Set();
  for (const player of players) {
    if (player === null || typeof player !== 'object') {
      throw new Error('Each player must be an object with an id and colors.');
    }
    const { id, colors } = player;
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Player id must be a non-empty string.');
    }
    if (seenIds.has(id)) {
      throw new Error(`Duplicate player id: ${id}.`);
    }
    seenIds.add(id);

    if (!Array.isArray(colors) || colors.length < 1 || colors.length > 3) {
      throw new Error(`Player ${id} must own 1 to 3 colors.`);
    }
    for (const color of colors) {
      if (!COLORS.includes(color)) {
        throw new Error(
          `Invalid color for player ${id}: ${color}. Allowed colors are ${COLORS.join(', ')}.`,
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

  const knownIds = new Set(playerIds);
  const allied = new Set();
  for (const alliance of alliances) {
    if (!Array.isArray(alliance) || alliance.length < 2) {
      throw new Error('Each alliance must be an array of at least 2 player ids.');
    }
    for (const id of alliance) {
      if (!knownIds.has(id)) {
        throw new Error(`Alliance references unknown player id: ${id}.`);
      }
      if (allied.has(id)) {
        throw new Error(`Player ${id} cannot belong to more than one alliance.`);
      }
      allied.add(id);
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
    const playerIds = players.map(p => p.id);
    validateAlliances(alliances, playerIds);

    // Players in turn order, each with an id and the colors they own.
    this.players = players.map(p => ({ id: p.id, colors: [...p.colors] }));
    // Declared alliances as arrays of player ids. Allied tokens never capture each other.
    this.alliances = alliances.map(a => [...a]);
    // Lookup of player id to next player id in turn order.
    this.nextPlayerMap = buildNextPlayerMap(playerIds);
    // Lookup of color to the id of the player who owns it.
    this.colorOwner = new Map();
    // Lookup of player id to alliance id. Players without an alliance get their own.
    this.playerAlliance = new Map();
    // Id of the player whose turn it is.
    this.currentPlayerId = playerIds[0];
    // Current phase: ROLL, MOVE or GAME_OVER.
    this.phase = GAME_PHASES.ROLL;
    // Last accepted dice value, or null when no move is pending.
    this.currentDiceValue = null;
    // Tokens the current player may move with the current dice value.
    this.movableTokens = [];
    // Player ids in finishing order. The last player is appended when the game ends.
    this.rankings = [];
    // Consecutive sixes rolled by the current player in the current turn chain.
    this.consecutiveSixes = 0;
    // All tokens of all active colors.
    this.tokens = [];

    for (const player of this.players) {
      for (const color of player.colors) {
        this.colorOwner.set(color, player.id);
      }
    }

    let nextAllianceId = 0;
    for (const alliance of this.alliances) {
      for (const id of alliance) {
        this.playerAlliance.set(id, nextAllianceId);
      }
      nextAllianceId++;
    }
    for (const player of this.players) {
      if (!this.playerAlliance.has(player.id)) {
        this.playerAlliance.set(player.id, nextAllianceId++);
      }
    }

    for (const player of this.players) {
      for (const color of player.colors) {
        for (let i = 0; i < 4; i++) {
          this.tokens.push(new Token(`${color}_${i}`, color, i));
        }
      }
    }
  }

  // Alias of currentPlayerId.
  get currentTurn() {
    return this.currentPlayerId;
  }

  // Ids of players who have not finished yet, in turn order.
  get activePlayers() {
    return this.players.map(p => p.id).filter(id => !this.rankings.includes(id));
  }

  get isGameOver() {
    return this.phase === GAME_PHASES.GAME_OVER;
  }

  getPlayerColors(playerId) {
    return this.players.find(p => p.id === playerId)?.colors ?? [];
  }

  getPlayerOfColor(color) {
    return this.colorOwner.get(color) ?? null;
  }

  getAllianceOf(playerId) {
    return this.playerAlliance.get(playerId) ?? null;
  }

  areAllies(playerIdA, playerIdB) {
    const a = this.playerAlliance.get(playerIdA);
    return a !== undefined && a === this.playerAlliance.get(playerIdB);
  }

  getTokensByColor(color) {
    return this.tokens.filter(token => token.color === color);
  }

  getTokensByPlayer(playerId) {
    const colors = this.getPlayerColors(playerId);
    return this.tokens.filter(token => colors.includes(token.color));
  }

  isPlayerFinished(playerId) {
    return this.getTokensByPlayer(playerId).every(token => token.isAtGoal);
  }

  getMovableTokens(playerId, diceValue) {
    return this.getTokensByPlayer(playerId).filter(token => {
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
    this.movableTokens = [];

    if (
      hasExtraTurn &&
      !this.isPlayerFinished(this.currentPlayerId) &&
      !this.isGameOver
    ) {
      this.phase = GAME_PHASES.ROLL;
      return;
    }

    if (this.activePlayers.length <= 1) {
      // Rank the last remaining player so rankings covers every player.
      this.rankings.push(...this.activePlayers);
      this.phase = GAME_PHASES.GAME_OVER;
      return;
    }

    this.currentPlayerId = this._getNextActivePlayer();
    this.consecutiveSixes = 0;
    this.phase = GAME_PHASES.ROLL;
  }

  _getNextActivePlayer() {
    let nextPlayer = this.nextPlayerMap[this.currentPlayerId];
    while (this.rankings.includes(nextPlayer)) {
      nextPlayer = this.nextPlayerMap[nextPlayer];
    }
    return nextPlayer;
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

    const playerId = this.currentPlayerId;

    if (value === 6) {
      this.consecutiveSixes += 1;
      if (this.consecutiveSixes === 3) {
        this.consecutiveSixes = 0;
        this.endTurn(false);
        return {
          playerId,
          turnPassed: true,
          passReason: PASS_REASONS.THREE_CONSECUTIVE_SIXES,
          movableTokens: [],
        };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const movable = this.getMovableTokens(playerId, value);

    if (movable.length === 0) {
      this.consecutiveSixes = 0;
      this.endTurn(false);
      return {
        playerId,
        turnPassed: true,
        passReason: PASS_REASONS.NO_MOVABLE_TOKENS,
        movableTokens: [],
      };
    }

    this.currentDiceValue = value;
    this.movableTokens = movable;
    this.phase = GAME_PHASES.MOVE;

    return {
      playerId,
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

    const playerId = this.currentPlayerId;
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
        t =>
          t.trackCell === token.trackCell &&
          !this.areAllies(playerId, this.getPlayerOfColor(t.color)),
      );
      for (const opponent of opponents) {
        opponent.step = -1;
        capturedTokens.push(opponent);
      }
    }

    let playerFinished = false;
    let finishRank = null;
    if (isGoal && this.isPlayerFinished(playerId)) {
      playerFinished = true;
      this.rankings.push(playerId);
      finishRank = this.rankings.length;
    }

    const hasExtraTurn =
      !playerFinished &&
      (this.currentDiceValue === 6 || capturedTokens.length > 0 || isGoal);

    this.endTurn(hasExtraTurn);

    return {
      playerId,
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
