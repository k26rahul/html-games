import { html } from '../utils/html.js';
import Achex from '../../Achex.js';
import Toolbar from './Toolbar.js';
import ConnectionBox from './ConnectionBox.js';
import { markRaw } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
  name: 'App',
  components: {
    Toolbar,
    ConnectionBox
  },
  data() {
    return {
      nextConnId: 1,
      nextUserIdx: 1,
      nextHubIdx: 1,

      newUsernameInput: '',

      selectedInstance: 'wss://cloud.achex.ca/',
      instances: {
        Root: 'wss://cloud.achex.ca/',
        Stoloto: 'wss://cloud.achex.ca/stoloto.ru.net',
        Agar: 'wss://cloud.achex.ca/agar.io',
        Test: 'wss://cloud.achex.ca/testinst',
      },

      connections: [],
    };
  },
  computed: {
    defaultNextUsername() {
      return `User_${this.nextUserIdx}`;
    },
    globalUsernames() {
      return [...new Set(this.connections.map(c => c.username))];
    },
    globalSIDs() {
      return [...new Set(this.connections.filter(c => c.sid).map(c => c.sid))];
    },
    globalHubs() {
      return [...new Set(this.connections.filter(c => c.currentHub).map(c => c.currentHub))];
    },
  },
  methods: {
    createConnection() {
      const username = this.newUsernameInput.trim() || this.defaultNextUsername;

      if (!this.newUsernameInput.trim()) {
        this.nextUserIdx++;
      }

      const achexInstance = markRaw(
        new Achex({
          url: this.selectedInstance,
          username: username,
        }),
      );

      const initialUser = this.globalUsernames.length > 0 ? this.globalUsernames[0] : '';

      const connState = {
        id: this.nextConnId++,
        achexInstance: achexInstance,
        status: 'Disconnected',
        url: this.selectedInstance,
        username: username,
        sid: null,
        currentHub: null,

        hubInput: 'Hub_1',
        sendTargetType: 'user',
        sendTarget: initialUser,
        selectedUserTarget: initialUser,
        selectedSessionTarget: '',
        selectedHubTarget: '',
        messagePayload: 'Hello!',

        logs: [],

        addLog(eventName, data) {
          const time = new Date().toLocaleTimeString();

          if (data instanceof Error) {
            data = { message: data.message };
          }

          this.logs.push({
            time,
            event: eventName,
            data: data ? JSON.stringify(data, null, 2) : '',
          });
        },
      };

      this.connections.push(connState);
      this.attachEventListeners(this.connections[this.connections.length - 1]);
      this.newUsernameInput = '';
    },

    attachEventListeners(conn) {
      const instance = conn.achexInstance;

      const scrollLog = () => {
        this.$nextTick(() => {
          const el = document.getElementById('log-' + conn.id);
          if (el) el.scrollTop = el.scrollHeight;
        });
      };

      instance.on('connected', data => {
        conn.status = 'Connected';
        conn.sid = data.sessionID;
        conn.addLog('connected', data);
        scrollLog();
      });

      instance.on('disconnected', data => {
        conn.status = 'Disconnected';
        conn.sid = null;
        conn.currentHub = null;
        conn.addLog('disconnected', null);
        scrollLog();
      });

      instance.on('reconnecting', () => {
        conn.status = 'Reconnecting...';
        conn.addLog('reconnecting', null);
        scrollLog();
      });

      instance.on('error', err => {
        conn.addLog('error', { message: err.message || 'Native WebSocket Error' });
        scrollLog();
      });

      instance.on('hub:joined', data => {
        conn.currentHub = data.hub;
        conn.addLog('hub:joined', data);
        scrollLog();
      });

      instance.on('hub:left', data => {
        conn.currentHub = null;
        conn.addLog('hub:left', data);
        scrollLog();
      });

      instance.on('hub:user_left', data => {
        conn.addLog('hub:user_left', data);
        scrollLog();
      });

      instance.on('message:hub', data => {
        conn.addLog('message:hub', data);
        scrollLog();
      });
      instance.on('message:user', data => {
        conn.addLog('message:user', data);
        scrollLog();
      });
      instance.on('message:session', data => {
        conn.addLog('message:session', data);
        scrollLog();
      });
    },

    async connectInstance(conn) {
      conn.status = 'Connecting...';
      try {
        await conn.achexInstance.connect();
      } catch (err) {
        conn.addLog('connection_failed', err);
        this.$nextTick(() => {
          const el = document.getElementById('log-' + conn.id);
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    },

    disconnectInstance(conn) {
      conn.achexInstance.disconnect();
    },

    deleteInstance(conn) {
      if (conn.status === 'Connected' || conn.status === 'Connecting...' || conn.status === 'Reconnecting...') {
        conn.achexInstance.disconnect();
      }
      this.connections = this.connections.filter(c => c.id !== conn.id);
    },

    joinHub(conn) {
      if (!conn.hubInput.trim()) return;
      conn.achexInstance.joinHub(conn.hubInput.trim());
    },

    leaveHub(conn) {
      if (!conn.currentHub) return;
      conn.achexInstance.leaveHub(conn.currentHub);
    },

    sendMessage(conn) {
      const payload = conn.messagePayload;
      const target = conn.sendTarget;

      if (!payload || !target) return;

      if (conn.sendTargetType === 'user') {
        conn.achexInstance.sendToUser(target, payload);
        conn.addLog(`sent to User (${target})`, payload);
      } else if (conn.sendTargetType === 'session') {
        conn.achexInstance.sendToSession(parseInt(target), payload);
        conn.addLog(`sent to Session (${target})`, payload);
      } else if (conn.sendTargetType === 'hub') {
        conn.achexInstance.sendToHub(target, payload);
        conn.addLog(`sent to Hub (${target})`, payload);
      }

      this.$nextTick(() => {
        const el = document.getElementById('log-' + conn.id);
        if (el) el.scrollTop = el.scrollHeight;
      });
    },

    handleTargetTypeChange(conn) {
      const type = conn.sendTargetType;
      if (type === 'user') {
        if (conn.selectedUserTarget) {
          conn.sendTarget = conn.selectedUserTarget;
        } else if (this.globalUsernames.length > 0) {
          conn.sendTarget = this.globalUsernames[0];
          conn.selectedUserTarget = this.globalUsernames[0];
        } else {
          conn.sendTarget = '';
        }
      } else if (type === 'session') {
        if (conn.selectedSessionTarget) {
          conn.sendTarget = conn.selectedSessionTarget;
        } else if (this.globalSIDs.length > 0) {
          conn.sendTarget = this.globalSIDs[0];
          conn.selectedSessionTarget = this.globalSIDs[0];
        } else {
          conn.sendTarget = '';
        }
      } else if (type === 'hub') {
        if (conn.selectedHubTarget) {
          conn.sendTarget = conn.selectedHubTarget;
        } else if (this.globalHubs.length > 0) {
          conn.sendTarget = this.globalHubs[0];
          conn.selectedHubTarget = this.globalHubs[0];
        } else {
          conn.sendTarget = '';
        }
      }
    },

    updateSelectedTargetTracker(conn) {
      const type = conn.sendTargetType;
      const target = conn.sendTarget;
      if (type === 'user') {
        conn.selectedUserTarget = target;
      } else if (type === 'session') {
        conn.selectedSessionTarget = target;
      } else if (type === 'hub') {
        conn.selectedHubTarget = target;
      }
    },
  },
  template: html`
    <Toolbar
      :instances="instances"
      :selectedInstance="selectedInstance"
      @update:selectedInstance="selectedInstance = $event"
      :newUsernameInput="newUsernameInput"
      @update:newUsernameInput="newUsernameInput = $event"
      :defaultNextUsername="defaultNextUsername"
      @create-connection="createConnection"
    />

    <div class="grid">
      <ConnectionBox
        v-for="conn in connections"
        :key="conn.id"
        :conn="conn"
        :globalUsernames="globalUsernames"
        :globalSIDs="globalSIDs"
        :globalHubs="globalHubs"
        @connect-instance="connectInstance"
        @disconnect-instance="disconnectInstance"
        @delete-instance="deleteInstance"
        @join-hub="joinHub"
        @leave-hub="leaveHub"
        @send-message="sendMessage"
        @target-type-change="handleTargetTypeChange"
        @update-selected-target="updateSelectedTargetTracker"
      />
    </div>
  `
};
