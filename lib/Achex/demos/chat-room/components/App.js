import { html } from '../utils/html.js';
import Achex from '../../../Achex.js';
import Setup from './Setup.js';
import Chat from './Chat.js';
import { markRaw } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

export default {
  name: 'App',
  components: {
    Setup,
    Chat
  },
  data() {
    // Check if there is a roomId in the URL query params to pre-fill
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    
    return {
      appState: 'setup', // 'setup' or 'chat'
      
      // User Profile
      displayName: '',
      avatarSeed: '',
      myUuid: crypto.randomUUID(),
      
      // Room Info
      roomId: roomParam || '',
      
      // Achex
      achexInstance: null,
      
      // Chat Data
      messages: [],
      userRegistry: {}, // Maps UUID to displayName
      onlineUsers: {},  // Tracks active online users
      
      presenceInterval: null,
      cleanupInterval: null
    };
  },
  computed: {
    onlineUsersList() {
      // Add ourselves
      const list = [{
        uuid: this.myUuid,
        displayName: this.displayName + ' (You)',
        avatar: this.avatarSeed
      }];
      // Add others
      for (const [uuid, user] of Object.entries(this.onlineUsers)) {
        list.push({ uuid, ...user });
      }
      return list;
    }
  },
  methods: {
    handleSetup({ displayName, avatarSeed, roomId }) {
      this.displayName = displayName;
      this.avatarSeed = avatarSeed;
      this.roomId = roomId;
      
      // Update URL query param for sharing
      const url = new URL(window.location);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url);

      this.connectToRoom();
    },

    connectToRoom() {
      // Create Achex instance using a unique UUID as the username
      this.achexInstance = markRaw(
        new Achex({
          url: 'wss://cloud.achex.ca/',
          username: this.myUuid
        })
      );

      this.attachEventListeners();
      
      this.achexInstance.connect().catch(err => {
        console.error('Failed to connect:', err);
        alert('Failed to connect to chat server.');
      });
    },

    attachEventListeners() {
      const instance = this.achexInstance;

      instance.on('connected', () => {
        instance.joinHub(this.roomId);
      });

      instance.on('hub:joined', () => {
        this.appState = 'chat';
        
        // Broadcast system join message
        instance.sendToHub(this.roomId, JSON.stringify({
          type: 'system',
          action: 'join',
          displayName: this.displayName,
          avatar: this.avatarSeed
        }));
        
        // Start presence broadcast
        this.presenceInterval = setInterval(() => {
          instance.sendToHub(this.roomId, JSON.stringify({
            type: 'system',
            action: 'presence',
            displayName: this.displayName,
            avatar: this.avatarSeed
          }));
        }, 5000);

        // Start cleanup interval to remove stale users (no presence in 15s)
        this.cleanupInterval = setInterval(() => {
          const now = Date.now();
          for (const uuid in this.onlineUsers) {
            if (now - this.onlineUsers[uuid].lastSeen > 15000) {
              delete this.onlineUsers[uuid];
            }
          }
        }, 5000);
      });

      instance.on('message:hub', (data) => {
        if (data.toH !== this.roomId) return;
        
        try {
          const payload = JSON.parse(data.payload);
          const senderUuid = data.FROM;
          
          if (senderUuid === this.myUuid) return; // Prevent duplication from Achex echo
          
          // Register the user's display name and update presence
          if (payload.displayName) {
            this.userRegistry[senderUuid] = payload.displayName;
            this.onlineUsers[senderUuid] = {
              displayName: payload.displayName,
              avatar: payload.avatar,
              lastSeen: Date.now()
            };
          }

          // Ignore presence pings for the chat feed
          if (payload.type === 'system' && payload.action === 'presence') return;

          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          this.messages.push({
            id: crypto.randomUUID(),
            type: payload.type || 'chat',
            action: payload.action,
            displayName: payload.displayName || 'Unknown',
            avatar: payload.avatar || 'Felix',
            text: payload.text || '',
            time: time,
            isMe: senderUuid === this.myUuid
          });
        } catch (e) {
          // Ignore non-JSON or improperly formatted messages
        }
      });

      instance.on('hub:user_left', (data) => {
        if (data.hub !== this.roomId) return;
        
        const leaverUuid = data.username;
        const leaverName = this.userRegistry[leaverUuid];
        
        delete this.onlineUsers[leaverUuid];
        
        if (leaverName) {
          this.messages.push({
            id: crypto.randomUUID(),
            type: 'system',
            action: 'leave',
            displayName: leaverName
          });
        }
      });

      instance.on('disconnected', () => {
        // If disconnected unexpectedly, we could handle UI state here
        // For simplicity, we just log it in this demo
        console.log('Disconnected from Achex server');
      });
    },

    handleSendMessage(text) {
      if (!this.achexInstance || this.appState !== 'chat') return;
      
      const payload = {
        type: 'chat',
        displayName: this.displayName,
        avatar: this.avatarSeed,
        text: text
      };

      this.achexInstance.sendToHub(this.roomId, JSON.stringify(payload));
      
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.messages.push({
        id: crypto.randomUUID(),
        type: 'chat',
        action: undefined,
        displayName: this.displayName,
        avatar: this.avatarSeed,
        text: text,
        time: time,
        isMe: true
      });
    },

    handleLeaveRoom() {
      if (this.presenceInterval) clearInterval(this.presenceInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      this.onlineUsers = {};

      if (this.achexInstance) {
        this.achexInstance.disconnect();
      }
      
      this.appState = 'setup';
      this.messages = [];
      
      // Clear URL query param
      const url = new URL(window.location);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url);
    }
  },
  template: html`
    <div>
      <Setup 
        v-if="appState === 'setup'" 
        :initialRoomId="roomId" 
        @join-room="handleSetup" 
        @create-room="handleSetup" 
      />
      
      <Chat 
        v-if="appState === 'chat'" 
        :roomId="roomId" 
        :messages="messages"
        :displayName="displayName"
        :avatarSeed="avatarSeed"
        :onlineUsers="onlineUsersList"
        @send-message="handleSendMessage"
        @leave-room="handleLeaveRoom"
      />
    </div>
  `
};
