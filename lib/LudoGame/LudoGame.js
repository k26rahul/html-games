import { COLORS } from './constants.js';
import Token from './Token.js';

export default class LudoGame {
  constructor() {
    this.tokens = [];

    for (const color of COLORS) {
      for (let i = 0; i < 4; i++) {
        this.tokens.push(new Token(`${color}_${i}`, color, i));
      }
    }
  }
}
