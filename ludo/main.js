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
      if (color == 'red' && pathN == 2 && cellN == 1) return true;
      if (color == 'green' && pathN == 2 && cellN == 1) return true;
      if (color == 'yellow' && pathN == 2 && cellN == 6) return true;
      if (color == 'blue' && pathN == 2 && cellN == 6) return true;
    },
  },
});

app.mount('#app');
