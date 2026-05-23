/**
 * Achex.js
 * * A robust, self-healing WebSocket wrapper for the Achex Cloud.
 * Abstracts authentication, internal heartbeats, and message routing.
 */

import EventEmitter from '../EventEmitter/EventEmitter.js';

export default class Achex extends EventEmitter {
  static CLOUD_URLS = {
    ROOT: 'wss://cloud.achex.ca/',
    STOLOTO: 'wss://cloud.achex.ca/stoloto.ru.net',
    AGAR: 'wss://cloud.achex.ca/agar.io',
    TEST: 'wss://cloud.achex.ca/testinst',
  };

  constructor({
    url = Achex.CLOUD_URLS.STOLOTO,
    username = null,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = {}) {
    super();
    this.url = url;
    // Generate a random 8-character string if no username is provided
    this.username = username || `user_${Math.random().toString(36).substring(2, 10)}`;
    this.autoReconnect = autoReconnect;
    this.reconnectInterval = reconnectInterval;

    this.ws = null;
    this.sessionID = null;
    this.currentHub = null;

    this._pingInterval = null;
    this._reconnectTimer = null;
    this._intentionalDisconnect = false;

    // Promise resolvers for the connection phase
    this._authResolve = null;
    this._authReject = null;
  }

  /**
   * Initializes the WebSocket and handles the Achex Auth handshake.
   * @returns {Promise<number>} Resolves with the Session ID (SID) once authenticated.
   */
  async connect() {
    // Prevent overlapping connection attempts
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return Promise.resolve(this.sessionID);
    }

    this._intentionalDisconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    return new Promise((resolve, reject) => {
      this._authResolve = resolve;
      this._authReject = reject;

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        // Automatically perform the legacy authentication handshake
        this.ws.send(JSON.stringify({ auth: this.username, passwd: 'none' }));
      };

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          this._routeMessage(data);
        } catch (err) {
          console.error('Achex Parsing Error:', err);
        }
      };

      this.ws.onerror = error => {
        this.emit('error', error);
        if (this._authReject) {
          this._authReject(new Error('WebSocket Connection Failed'));
          this._clearAuthPromises();
        }
      };

      this.ws.onclose = event => {
        this._stopHeartbeat();
        this.sessionID = null;
        this.currentHub = null;
        this.emit('disconnected', event);

        if (this._authReject) {
          this._authReject(new Error('WebSocket Closed before authentication'));
          this._clearAuthPromises();
        }

        if (this.autoReconnect && !this._intentionalDisconnect) {
          this.emit('reconnecting');
          this._reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {});
          }, this.reconnectInterval);
        }
      };
    });
  }

  /**
   * Gracefully closes the connection and stops background tasks.
   */
  disconnect() {
    this._intentionalDisconnect = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  // ==========================================
  // SENDING METHODS
  // ==========================================

  send(dataObject) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(dataObject));
    } else {
      console.warn('Achex is not connected. Message dropped.');
    }
  }

  joinHub(hubName) {
    this.currentHub = hubName;
    this.send({ joinHub: hubName });
  }

  leaveHub(hubName) {
    if (this.currentHub === hubName) {
      this.currentHub = null;
      this.emit('hub:left', { hub: hubName });
    }
    this.send({ leaveHub: hubName });
  }

  sendToHub(hubName, payload) {
    this.send({ toH: hubName, payload });
  }

  sendToUser(username, payload) {
    this.send({ to: username, payload });
  }

  sendToSession(sessionID, payload) {
    this.send({ toS: sessionID, payload });
  }

  // ==========================================
  // INTERNAL MECHANICS
  // ==========================================

  /**
   * Prevents Achex from dropping the connection due to being idle.
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    this._pingInterval = setInterval(() => {
      this.send({ ping: true });
    }, 25000); // Send ping every 25 seconds
  }

  _stopHeartbeat() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  _clearAuthPromises() {
    this._authResolve = null;
    this._authReject = null;
  }

  /**
   * Internal router that translates raw Achex JSON into clean, specific events.
   */
  _routeMessage(data) {
    // 1. Authentication Phase
    if (data.auth === 'OK' && this._authResolve) {
      this.sessionID = data.SID;
      this._startHeartbeat();
      this.emit('connected', { sessionID: this.sessionID, username: this.username });

      this._authResolve(this.sessionID);
      this._clearAuthPromises();
      return; // Stop routing auth message further
    }

    // 2. Hub Events
    if (data.joinHub === 'OK') this.emit('hub:joined', { hub: this.currentHub });
    if (data.leaveHub === 'OK') this.emit('hub:left', { hub: data.leaveHub }); // Note: Achex returns 'Ok'
    if (data.leftHub)
      this.emit('hub:user_left', {
        username: data.user,
        sessionID: data.sID,
        hub: data.leftHub,
      });

    // 3. Message Routing
    if (data.FROM) {
      if (data.toH) this.emit('message:hub', data);
      else if (data.to) this.emit('message:user', data);
      else if (data.toS) this.emit('message:session', data);
    }

    // 4. Catch-all for logging/debugging
    this.emit('raw', data);
  }
}
