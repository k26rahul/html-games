# Achex.js Playground

## Overview

The Playground serves as a multi-connection testing interface for `Achex.js`. It allows developers to instantiate multiple independent WebSocket connections to various hubs and route messages simultaneously across different instances to observe pub/sub behavior in real-time.

*(For details regarding the core buildless architecture powering this demo, please refer to the [Demos README](../README.md).)*

## How It Works

State is managed centrally in the root `App` component. It tracks all active connections (`connections`), global usernames, session IDs, and active hubs. Each time a connection is created, it is pushed to the central state, and the `App` component passes down the relevant data and event listeners to the individual `ConnectionBox` components.

## Directory Structure

### Core Files
- **`index.html`**: The entry point.
- **`style.css`**: Contains all visual styling, utilizing modern UI design principles (glassmorphism, CSS Grid).
- **`main.js`**: Bootstraps the Vue 3 instance.

### Components (`/components`)
- **`App.js`**: The root component. It holds the global state, instantiates the `Achex` connections, and acts as the single source of truth for the application.
- **`Toolbar.js`**: The header component that allows users to specify a username and spawn new connections.
- **`ConnectionBox.js`**: A reusable UI component representing a single Achex connection. It renders the connection status, event logs, and controls for joining hubs or sending messages.
