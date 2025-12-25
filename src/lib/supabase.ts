import { io, Socket } from 'socket.io-client';

// Socket.IO client
let socket: Socket | null = null;

// Get Socket.IO server URL from environment variable
// Default to same origin in production, localhost:3000 in development
const SOCKET_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin)
  : 'http://localhost:3000';

console.log('🔗 Socket.IO URL:', SOCKET_URL);

export function getSocket(): Socket {
  if (!socket) {
    console.log('🆕 Creating new Socket.IO client for:', SOCKET_URL);
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    
    // Debug logging
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
    });
  }
  return socket;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  content: string;
  type: 'text' | 'code' | 'image' | 'file';
  code_language?: string;
  file_url?: string;
  file_name?: string;
  reply_to?: string;
  reactions?: Record<string, string[]>; // emoji -> array of user_ids
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  room_id: string;
  last_seen: string;
  is_typing?: boolean;
}

export interface Room {
  id: string;
  slug: string;
  created_at: string;
  participant_count: number;
}
