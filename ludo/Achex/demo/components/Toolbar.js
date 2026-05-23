import { html } from '../utils/html.js';

export default {
  name: 'Toolbar',
  props: {
    instances: Object,
    selectedInstance: String,
    newUsernameInput: String,
    defaultNextUsername: String
  },
  emits: ['update:selectedInstance', 'update:newUsernameInput', 'create-connection'],
  template: html`
    <div class="toolbar">
      <h2>Achex.js - Multi-Connection Tester</h2>
      <div class="toolbar-desc">Test multiple connections, join hubs, and route messages across instances.</div>
      <div class="control-row">
        <label>Instance:</label>
        <select 
          :value="selectedInstance" 
          @change="$emit('update:selectedInstance', $event.target.value)"
        >
          <option v-for="(url, name) in instances" :value="url">{{ name }}</option>
        </select>

        <label style="margin-left: 10px">New Username:</label>
        <input 
          :value="newUsernameInput" 
          @input="$emit('update:newUsernameInput', $event.target.value)" 
          :placeholder="defaultNextUsername" 
        />
        <button @click="$emit('create-connection')">Create Connection</button>
      </div>
    </div>
  `
};
