import LudoGame from './LudoGame.js';
import { COLORS, createGalleries, createTokens } from './boardConfig.js';

const game = new LudoGame();

const app = Vue.createApp({
  data() {
    return {
      colors: COLORS,
      galleries: createGalleries(),
      tokens: createTokens(),
    };
  },

  mounted() {},
});

app.mount('#app');
