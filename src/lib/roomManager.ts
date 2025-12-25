import { getSocket } from './supabase';
import { Message, User } from './supabase';
import { Socket } from 'socket.io-client';

export class RoomManager {
  private socket: Socket;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private roomId: string | null = null;

  constructor() {
    this.socket = getSocket();
  }

  async createOrJoinRoom(slug: string, userId: string, userName: string, userColor: string, maxUsers?: number | null, password?: string): Promise<{ roomId: string; messages: Message[]; users: User[]; maxUsers: number | null }> {
    return new Promise((resolve, reject) => {
      if (!this.socket.connected) {
        this.socket.connect();
      }

      this.socket.emit('join-room', { roomSlug: slug, userId, userName, userColor, maxUsers, password });

      this.socket.once('room-joined', (data: { roomId: string; messages: Message[]; users: User[]; maxUsers: number | null }) => {
        this.roomId = data.roomId;
        resolve(data);
      });

      this.socket.once('room-full', (data: { message: string }) => {
        reject(new Error(data.message));
      });

      this.socket.once('auth-failed', (data: { message: string }) => {
        reject(new Error('Invalid admin password'));
      });

      this.socket.once('error', (error: { message: string }) => {
        reject(new Error(error.message));
      });

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Room join timeout')), 5000);
    });
  }

  async leaveRoom(userId: string) {
    if (this.roomId) {
      this.socket.emit('leave-room', { userId, roomId: this.roomId });
    }
    this.stopHeartbeat();
    this.socket.disconnect();
  }

  startHeartbeat(userId: string) {
    this.heartbeatInterval = setInterval(() => {
      this.socket.emit('heartbeat', { userId });
    }, 10000); // Update every 10 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async sendMessage(message: Omit<Message, 'id' | 'created_at'>) {
    if (!this.roomId) throw new Error('Not in a room');
    this.socket.emit('send-message', { roomId: this.roomId, message });
  }

  async getMessages(roomId: string): Promise<Message[]> {
    // Messages are received via room-joined event
    return [];
  }

  async getOnlineUsers(roomId: string): Promise<User[]> {
    // Users are received via room-joined event
    return [];
  }

  async updateTypingStatus(userId: string, isTyping: boolean) {
    if (!this.roomId) return;
    this.socket.emit('typing', { roomId: this.roomId, userId, isTyping });
  }

  async addReaction(messageId: string, emoji: string, userId: string) {
    this.socket.emit('add-reaction', { messageId, emoji, userId });
  }

  subscribeToRoom(
    roomId: string,
    onMessage: (message: Message) => void,
    onUserChange: (users: User[]) => void
  ) {
    // Subscribe to new messages
    this.socket.on('new-message', onMessage);
    
    // Subscribe to message updates (reactions)
    this.socket.on('message-updated', onMessage);
    
    // Subscribe to user changes
    this.socket.on('users-updated', onUserChange);
    
    // Handle user joined
    this.socket.on('user-joined', (user: User) => {
      // Will be handled by users-updated event
    });
    
    // Handle user left
    this.socket.on('user-left', (userId: string) => {
      // Will be handled by users-updated event
    });

    return this.socket;
  }

  unsubscribe() {
    this.socket.off('new-message');
    this.socket.off('message-updated');
    this.socket.off('users-updated');
    this.socket.off('user-joined');
    this.socket.off('user-left');
  }
}
