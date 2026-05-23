import { html } from '../utils/html.js';

export default {
  name: 'ConnectionBox',
  props: {
    conn: Object,
    globalUsernames: Array,
    globalSIDs: Array,
    globalHubs: Array
  },
  emits: [
    'connect-instance', 
    'disconnect-instance', 
    'join-hub', 
    'leave-hub', 
    'send-message', 
    'target-type-change', 
    'update-selected-target'
  ],
  template: html`
    <div class="conn-box">
      <div class="box-header">
        <div>
          <strong>Status:</strong>
          <span :class="['status-badge', conn.status.toLowerCase().replaceAll('.', '')]">
            {{ conn.status }}
          </span>
        </div>
        <div><strong>Instance:</strong> <span class="value">{{ conn.url }}</span></div>
        <div><strong>Username:</strong> <span class="value">{{ conn.username }}</span></div>
        <div>
          <strong>SID:</strong> <span class="value">{{ conn.sid !== null ? conn.sid : 'Not Assigned' }}</span>
        </div>
        <div><strong>Current Hub:</strong> <span class="value">{{ conn.currentHub || 'None' }}</span></div>
      </div>

      <div class="control-row">
        <button
          class="btn-connect"
          @click="$emit('connect-instance', conn)"
          :disabled="conn.status === 'Connected' || conn.status === 'Connecting...' || conn.status === 'Reconnecting...'"
        >
          Connect
        </button>
        <button
          class="btn-disconnect"
          @click="$emit('disconnect-instance', conn)"
          :disabled="conn.status !== 'Connected' && conn.status !== 'Reconnecting...'"
        >
          Disconnect
        </button>
      </div>

      <div class="control-row">
        <input v-model="conn.hubInput" placeholder="Hub Name" style="width: 120px" />
        <button @click="$emit('join-hub', conn)" :disabled="conn.status !== 'Connected'">
          Join Hub
        </button>
        <button @click="$emit('leave-hub', conn)" :disabled="!conn.currentHub">
          Leave Hub
        </button>
      </div>

      <div class="control-row" style="border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 12px">
        <select v-model="conn.sendTargetType" @change="$emit('target-type-change', conn)">
          <option value="user">User</option>
          <option value="session">Session</option>
          <option value="hub">Hub</option>
        </select>

        <select v-model="conn.sendTarget" @change="$emit('update-selected-target', conn)" style="flex-grow: 1">
          <option disabled value="">Select Target...</option>
          <template v-if="conn.sendTargetType === 'user'">
            <option v-for="u in globalUsernames" :value="u">{{ u }}</option>
          </template>
          <template v-else-if="conn.sendTargetType === 'session'">
            <option v-for="s in globalSIDs" :value="s">{{ s }}</option>
          </template>
          <template v-else-if="conn.sendTargetType === 'hub'">
            <option v-for="h in globalHubs" :value="h">{{ h }}</option>
          </template>
        </select>
      </div>

      <form @submit.prevent="$emit('send-message', conn)" class="control-row">
        <input
          v-model="conn.messagePayload"
          placeholder="Enter message..."
          style="flex-grow: 1"
        />
        <button
          type="submit"
          :disabled="conn.status !== 'Connected' || !conn.sendTarget"
        >
          Send
        </button>
      </form>

      <strong style="color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">Event Logs:</strong>
      <div class="logs" :id="'log-' + conn.id">
        <div class="log-entry" v-for="log in conn.logs">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-event">{{ log.event }}</span>
          <span v-if="log.data" class="log-data">{{ log.data }}</span>
        </div>
      </div>
    </div>
  `
};
