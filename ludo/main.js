const app = Vue.createApp({
  data() {
    let tmp = [-1, -2, -3, -4];

    return {
      colors: ['red', 'green', 'yellow', 'blue'],
      tokenState: [...tmp, ...tmp, ...tmp, ...tmp],
    };
  },

  methods: {
    shouldGalleryBeVertical(color) {
      return ['green', 'blue'].includes(color);
    },
    shouldCellHaveStar(color, pathN, cellN) {
      if (color == 'red' && pathN == 3 && cellN == 2) return true;
      if (color == 'green' && pathN == 1 && cellN == 2) return true;
      if (color == 'yellow' && pathN == 1 && cellN == 5) return true;
      if (color == 'blue' && pathN == 3 && cellN == 5) return true;
    },
    shouldCellHaveArrow(color, pathN, cellN) {
      if (pathN == 2) {
        if (color == 'red' && cellN == 1) return true;
        if (color == 'green' && cellN == 1) return true;
        if (color == 'yellow' && cellN == 6) return true;
        if (color == 'blue' && cellN == 6) return true;
      }
    },
    shouldCellBeColored(color, pathN, cellN) {
      if (color == 'red') {
        if (pathN == 2 && cellN != 1) return true;
        if (pathN == 1 && cellN == 2) return true;
      }
      if (color == 'green') {
        if (pathN == 2 && cellN != 1) return true;
        if (pathN == 3 && cellN == 2) return true;
      }
      if (color == 'yellow') {
        if (pathN == 2 && cellN != 6) return true;
        if (pathN == 3 && cellN == 5) return true;
      }
      if (color == 'blue') {
        if (pathN == 2 && cellN != 6) return true;
        if (pathN == 1 && cellN == 5) return true;
      }
    },
    getColorForToken(n) {
      if (n <= 4) return 'red';
      if (n <= 8) return 'green';
      if (n <= 12) return 'yellow';
      return 'blue';
    },
  },

  mounted() {
    let colorToBaseStayCoordinates = {
      red: [0, 0],
      green: [1, 0],
      yellow: [1, 1],
      blue: [0, 1],
    };

    this.tokenState.forEach((location, tokenId) => {
      let elem = document.querySelector(`.token-${tokenId + 1}`);
      let color = this.getColorForToken(tokenId + 1);
      let [i, j] = colorToBaseStayCoordinates[color];

      if (location == -1) {
        elem.style.transform = `translate(
                                  calc((1.5 + 0.2 + ${i} * 9) * var(--cell-size)),
                                  calc((1.5 + 0.2 + ${j} * 9) * var(--cell-size))
                                )`;
      }
      if (location == -2) {
        elem.style.transform = `translate(
                                  calc((6 - 1.5 - 1.2 + 0.2 + ${i} * 9) * var(--cell-size)),
                                  calc((0 + 1.5 + 0.2 + ${j} * 9) * var(--cell-size))
                                )`;
      }
      if (location == -3) {
        elem.style.transform = `translate(
                                  calc((0 + 1.5 + 0.2 + ${i} * 9) * var(--cell-size)),
                                  calc((6 - 1.5 - 1.2 + 0.2 + ${j} * 9) * var(--cell-size))
                                )`;
      }
      if (location == -4) {
        elem.style.transform = `translate(
                                  calc((6 - 1.5 - 1.2 + 0.2 + ${i} * 9) * var(--cell-size)),
                                  calc((6 - 1.5 - 1.2 + 0.2 + ${j} * 9) * var(--cell-size))
                                )`;
      }
    });
  },
});

app.mount('#app');
