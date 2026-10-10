import { html } from '../utils/html.js';

export default {
  name: 'Setup',
  props: {
    initialRoomId: String
  },
  emits: ['join-room', 'create-room'],
  data() {
    return {
      displayName: this.generateRandomName(),
      avatarSeed: this.generateRandomSeed(),
      roomIdInput: this.initialRoomId || ''
    };
  },
  computed: {
    avatarUrl() {
      return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${this.avatarSeed}`;
    }
  },
  methods: {
    generateRandomName() {
      const adjectives = ['Happy', 'Bright', 'Swift', 'Gentle', 'Clear', 'Calm', 'Quiet', 'Brave', 'Kind', 'Cool'];
      const nouns = ['Panda', 'Fox', 'River', 'Star', 'Leaf', 'Breeze', 'Cloud', 'Bear', 'Bird', 'Ocean'];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      return `${adj} ${noun}`;
    },
    randomizeName() {
      this.displayName = this.generateRandomName();
    },
    generateRandomSeed() {
      const emojiOptions = ['😀','😎','🤖','👻','👾','👽','🐱','🐶','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵'];
      const randomEmoji = emojiOptions[Math.floor(Math.random() * emojiOptions.length)];
      return randomEmoji + Math.random().toString(36).substring(2, 8);
    },
    randomizeAvatar() {
      this.avatarSeed = this.generateRandomSeed();
    },
    joinRoom() {
      if (!this.displayName.trim() || !this.roomIdInput.trim()) return;
      this.$emit('join-room', {
        displayName: this.displayName.trim(),
        avatarSeed: this.avatarSeed,
        roomId: this.roomIdInput.trim()
      });
    },
    createRoom() {
      if (!this.displayName.trim()) return;
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.$emit('create-room', {
        displayName: this.displayName.trim(),
        avatarSeed: this.avatarSeed,
        roomId: newRoomId
      });
    }
  },
  template: html`
    <div class="setup-container">
      <div class="conn-box" style="max-width: 400px; margin: 40px auto; align-items: center;">
        <h2 style="font-size: 1.5rem; margin-bottom: 20px;">Join Chat Room</h2>
        
        <div class="avatar-section" style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px;">
          <img :src="avatarUrl" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 2px solid var(--primary);" />
          <button @click="randomizeAvatar" class="btn-random" title="Randomize Avatar">
            Randomize 🎲
          </button>
        </div>

        <div style="width: 100%; display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="color: var(--text-muted); font-size: 0.85rem;">Display Name</label>
            <div style="display: flex; gap: 8px;">
              <input v-model="displayName" placeholder="Enter your name..." style="flex: 1;" />
              <button @click="randomizeName" class="btn-random" title="Randomize Name" style="padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                🎲
              </button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="color: var(--text-muted); font-size: 0.85rem;">Room ID (To Join)</label>
            <input v-model="roomIdInput" placeholder="e.g. AB12CD" />
          </div>

          <div style="display: flex; gap: 12px; margin-top: 8px;">
            <button @click="joinRoom" style="flex: 1;" :disabled="!displayName.trim() || !roomIdInput.trim()">
              Join Room
            </button>
            <button @click="createRoom" style="flex: 1; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399;" :disabled="!displayName.trim()">
              Create New
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
