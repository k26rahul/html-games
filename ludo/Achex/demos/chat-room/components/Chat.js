import { html } from '../utils/html.js';

export default {
  name: 'Chat',
  props: {
    roomId: String,
    messages: Array,
    displayName: String,
    avatarSeed: String,
    onlineUsers: Array
  },
  emits: ['send-message', 'leave-room'],
  data() {
    return {
      messageInput: '',
      showQr: false,
      showOnlineUsers: false
    };
  },
  computed: {
    roomUrl() {
      // Create a URL with the roomId in the query parameters
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.roomId);
      url.hash = ''; // Clear any existing hash
      return url.toString();
    },
    qrCodeUrl() {
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(this.roomUrl)}&color=10b981&bgcolor=0a0e0c`;
    }
  },
  methods: {
    sendMessage() {
      if (!this.messageInput.trim()) return;
      this.$emit('send-message', this.messageInput.trim());
      this.messageInput = '';
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messagesContainer;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    },
    getAvatarUrl(seed) {
      return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`;
    }
  },
  watch: {
    messages: {
      handler() {
        this.scrollToBottom();
      },
      deep: true
    }
  },
  mounted() {
    this.scrollToBottom();
  },
  template: html`
    <div class="chat-container conn-box" style="max-width: 800px; margin: 20px auto; height: calc(100vh - 120px); display: flex; flex-direction: column; padding: 0;">
      
      <!-- Chat Header -->
      <div class="box-header chat-header" style="padding: 16px 24px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border);">
        <div style="display: flex; flex-direction: row; align-items: center; gap: 12px;">
          <button @click="$emit('leave-room')" style="background: transparent; padding: 6px; min-width: auto; border: 1px solid var(--card-border);">
            ←
          </button>
          <div>
            <h2 style="font-size: 1.2rem; margin: 0; background: none; -webkit-text-fill-color: var(--text-color);">Room: <span style="color: var(--primary);">{{ roomId }}</span></h2>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Logged in as {{ displayName }}</div>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button @click="showOnlineUsers = !showOnlineUsers; showQr = false" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #34d399;">
            {{ showOnlineUsers ? 'Hide Online' : 'Online (' + onlineUsers.length + ')' }}
          </button>
          <button @click="showQr = !showQr; showOnlineUsers = false" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); color: #fcd34d;">
            {{ showQr ? 'Hide Invite' : 'Invite / QR' }}
          </button>
        </div>
      </div>

      <!-- QR Code Modal / Dropdown -->
      <div v-if="showQr" style="padding: 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--card-border); display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <img :src="qrCodeUrl" alt="QR Code" style="border-radius: 8px; border: 4px solid var(--bg-color);" />
        <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
          Share this link or scan the QR code to join:<br/>
          <a :href="roomUrl" style="color: var(--primary); text-decoration: none; user-select: all;">{{ roomUrl }}</a>
        </div>
      </div>

      <!-- Online Users Modal / Dropdown -->
      <div v-if="showOnlineUsers" style="padding: 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--card-border); display: flex; flex-direction: column; gap: 12px; max-height: 200px; overflow-y: auto;">
        <h3 style="margin: 0; font-size: 1rem; color: var(--text-color);">Online Users</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 16px;">
          <div v-for="user in onlineUsers" :key="user.uuid" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 999px;">
            <img :src="getAvatarUrl(user.avatar)" style="width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.1);" />
            <span style="font-size: 0.85rem; font-weight: 500;">{{ user.displayName }}</span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 4px #10b981;"></span>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="chat-messages" style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
        <div v-if="messages.length === 0" style="text-align: center; color: var(--text-muted); margin-top: 40px; font-style: italic;">
          Welcome to the room! Send a message to start chatting.
        </div>
        
        <div v-for="msg in messages" :key="msg.id" :style="{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'system' ? 'center' : (msg.isMe ? 'flex-end' : 'flex-start') }">
          
          <!-- System Message -->
          <div v-if="msg.type === 'system'" style="background: rgba(255,255,255,0.03); padding: 4px 12px; border-radius: 999px; font-size: 0.8rem; color: var(--text-muted);">
            <span v-if="msg.action === 'join'">🟢 <b>{{ msg.displayName }}</b> joined the room</span>
            <span v-else-if="msg.action === 'leave'">🔴 <b>{{ msg.displayName }}</b> left the room</span>
          </div>

          <!-- Chat Message -->
          <div v-else :style="{ display: 'flex', gap: '12px', maxWidth: '80%', flexDirection: msg.isMe ? 'row-reverse' : 'row' }">
            <img :src="getAvatarUrl(msg.avatar)" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); flex-shrink: 0;" />
            <div :style="{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: msg.isMe ? 'flex-end' : 'flex-start' }">
              <div :style="{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'baseline', flexDirection: msg.isMe ? 'row-reverse' : 'row' }">
                <span style="font-weight: 600; color: var(--text-color);">{{ msg.displayName }}</span>
                <span style="font-size: 0.7rem;">{{ msg.time }}</span>
              </div>
              <div class="chat-message-bubble" :style="{ background: msg.isMe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: msg.isMe ? '12px 0 12px 12px' : '0 12px 12px 12px', fontSize: '0.95rem', lineHeight: '1.4' }">
                {{ msg.text }}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Input Area -->
      <form class="chat-input-area" @submit.prevent="sendMessage" style="padding: 16px 24px; border-top: 1px solid var(--card-border); display: flex; gap: 12px; background: rgba(0,0,0,0.1); border-radius: 0 0 12px 12px;">
        <input 
          v-model="messageInput" 
          placeholder="Type a message..." 
          style="flex: 1; border-radius: 999px; padding: 10px 16px; font-size: 0.95rem;" 
          autofocus 
        />
        <button type="submit" style="border-radius: 999px; padding: 10px 24px;" :disabled="!messageInput.trim()">
          Send
        </button>
      </form>
      
    </div>
  `
};
