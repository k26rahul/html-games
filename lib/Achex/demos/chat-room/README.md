# Achex.js Chat Room

## Overview

The Chat Room is a real-time, multi-user messaging application demonstrating the pub/sub and broadcasting capabilities of `Achex.js`.

*(For details regarding the core buildless architecture powering this demo, please refer to the [Demos README](../README.md).)*

## Features

- **Room Generation & Sharing:** Users can create unique rooms and invite others using shareable URL query parameters (`?room=ID`) and auto-generated QR codes.
- **Anonymous Identity:** Users join with a random Adjective-Noun display name and a randomized SVG avatar generated via the Dicebear API.
- **UUID Routing:** Under the hood, every participant establishes an Achex connection using a unique `crypto.randomUUID()` as their username, while maintaining their user-facing Display Name locally via JSON message payloads.
- **Live Presence & Heartbeats:** The application broadcasts background "presence" pings every 5 seconds. Stale users are swept from the roster automatically, providing an accurate, real-time "Online Users" list.
- **System Messaging:** Automatically broadcasts system-level events (e.g., "User X joined the room") distinct from standard chat messages.

## Directory Structure

### Core Files
- **`index.html`**: The entry point.
- **`style.css`**: Contains all visual styling, utilizing modern UI design principles and responsive mobile CSS media queries.
- **`main.js`**: Bootstraps the Vue 3 instance.

### Components (`/components`)
- **`App.js`**: The root component. It holds the global state (including the active online users roster), instantiates the single `Achex` connection, and handles the interval logic for presence heartbeats.
- **`Setup.js`**: The onboarding interface where users roll for a random display name, randomize their avatar, and choose to join or create a room.
- **`Chat.js`**: The primary messaging interface. It renders the chronological message feed, toggles the QR code and online users modals, and handles sending payloads back up to `App.js`.
