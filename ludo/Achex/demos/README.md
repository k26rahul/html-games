# Achex.js Demos Architecture

This directory contains various demonstration applications built to showcase the capabilities of the `Achex.js` wrapper. 

## General Architecture

All demos within this folder are built using a unified, modern, **buildless frontend architecture**. They leverage **Vue 3** (via ES Modules) and native browser capabilities to provide a modular, component-based structure without the overhead of a build step (like Webpack or Vite).

The core philosophy across all demos is simplicity and modularity:
- **Zero Build Step:** We rely entirely on native ES modules (`<script type="module">`).
- **Component Splitting:** Component logic and state are logically separated into individual `.js` files.
- **Buildless Templating:** HTML templates live alongside the component logic inside JS files, utilizing **Tagged Template Literals** via a simple identity function (`String.raw`).

### Tagged Template Literals

To maintain modularity without a bundler, the demos import a lightweight `html` utility (`export const html = String.raw;`). This allows developers to write templates directly within the JS modules:

```javascript
import { html } from '../utils/html.js';

export default {
  template: html`
    <div class="my-component">
      <h1>Hello World</h1>
    </div>
  `
}
```

**Benefits of this approach:**
1. **Colocation:** The template lives right next to the component logic.
2. **Editor Support:** Modern IDEs recognize the `html` tag and provide syntax highlighting for the inner strings.
3. **Native Support:** `String.raw` is native to JavaScript, resulting in zero overhead and no parsing step before runtime.

This overarching design makes the demos exceptionally easy to read, modify, and extend.
