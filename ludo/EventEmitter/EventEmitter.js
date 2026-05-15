/**
 * EventEmitter.js
 * * A lightweight, standalone Publish-Subscribe class.
 */

export default class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribes a listener function to a specific event.
   */
  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  /**
   * Unsubscribes a listener function from a specific event.
   */
  off(eventName, listener) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(l => l !== listener);
  }

  /**
   * Subscribes to an event, but automatically removes the listener after it fires once.
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      this.off(eventName, onceWrapper);
      listener(...args);
    };
    this.on(eventName, onceWrapper);
  }

  /**
   * Broadcasts an event, calling all subscribed listeners with the provided data.
   */
  emit(eventName, data) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(listener => listener(data));
  }

  /**
   * Cleans up memory by removing listeners.
   * If an eventName is provided, it clears only that event. Otherwise, it clears all.
   */
  removeAllListeners(eventName = null) {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
}
