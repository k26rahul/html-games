const app = Vue.createApp({
  data() {
    return {
      colors: ['red', 'green', 'yellow', 'blue'],
    };
  },

  methods: {
    shouldVerticalGalleryForColor(color) {
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
  },
});

app.mount('#app');
