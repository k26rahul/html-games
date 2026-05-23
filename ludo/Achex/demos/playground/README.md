# Achex.js Playground

## Architecture Overview

This demo application is built using a modern, buildless frontend architecture. It leverages **Vue 3** (via ES Modules) and native browser capabilities to provide a modular, component-based application structure without the complexity of a build step (like Webpack or Vite).

The core philosophy is simplicity and modularity:
- **Zero Build Step:** Uses native ES modules (`<script type="module">`).
- **Component Splitting:** Component logic and state are logically separated into individual `.js` files.
- **Tagged Template Literals:** HTML templates live alongside the component logic inside JS files, using a simple identity function (`String.raw`).

## How It Works

The application serves as a playground interface for `Achex.js`. It allows users to instantiate multiple independent websocket connections to various hubs and route messages simultaneously across different instances.

State is managed centrally in the root `App` component. It tracks all active connections (`connections`), global usernames, session IDs, and active hubs. Each time a connection is created, it is pushed to the central state, and the `App` component passes down the relevant data and event listeners to the individual `ConnectionBox` components.

## Directory Structure

### Core Files
- **`index.html`**: The entry point. It contains standard HTML boilerplate, imports typography, links the stylesheet, and bootstraps the `main.js` module.
- **`style.css`**: Contains all visual styling, utilizing CSS variables and modern UI design principles (glassmorphism, CSS Grid).
- **`main.js`**: Bootstraps the Vue 3 instance and mounts the root `App` component to the DOM.

### Components (`/components`)
- **`App.js`**: The root component. It holds the global state, instantiates the `Achex` connections, and attaches the websocket event listeners. It acts as the single source of truth for the application.
- **`Toolbar.js`**: The header component that allows users to select an Achex instance, specify a username, and spawn new connections.
- **`ConnectionBox.js`**: A reusable UI component representing a single Achex connection. It renders the connection status, event logs, and controls for joining hubs or sending messages.

### Utilities (`/utils`)
- **`html.js`**: Exports a lightweight `html` tagged template identity function (`String.raw`). 

## Developer Experience: Buildless Templating

To maintain modularity without introducing a bundler, this project utilizes **Tagged Template Literals** for HTML string templating inside the JavaScript files.

By importing the `html` utility (`export const html = String.raw;`), we can write templates directly in our JS modules like this:

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

**Why this approach?**
1. **Colocation:** The template lives right next to the component logic.
2. **Editor Support:** Modern IDEs recognize the `html` tag and provide syntax highlighting and formatting for HTML inside the JavaScript file.
3. **Native Support:** `String.raw` is built into JavaScript, meaning there is zero overhead and no parsing step required before runtime. 

This architecture makes it exceptionally easy for future developers (or AI agents) to understand, modify, and extend the application without having to navigate build configurations or complex tooling.
