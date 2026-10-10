const colors = ['red', 'green', 'yellow', 'blue'];

class Token {
  constructor(color) {
    this.color = color;
    this.location = -1;
  }
}

export default class LudoGame {
  constructor() {
    this.tokenState = [];

    for (let color of colors) {
      for (let i = 0; i < 4; i++) {
        this.tokenState.push(new Token(color));
      }
    }

    console.log(this.tokenState);
  }
}
