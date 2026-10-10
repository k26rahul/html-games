import { COLORS, createGalleries, createTokens } from './boardConfig.js';

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
