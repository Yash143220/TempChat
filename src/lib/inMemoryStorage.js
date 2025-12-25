const { nanoid } = require('nanoid');

class InMemoryStorage {
  constructor() {
    this.rooms = new Map(); // roomId -> { id, slug, createdAt, participantCount, maxUsers }
    this.users = new Map(); // userId -> { id, name, color, roomId, lastSeen, isTyping, socketId }
    this.messages = new Map(); // messageId -> Message
    this.roomMessages = new Map(); // roomId -> [messageIds]
    this.socketUsers = new Map(); // socketId -> userId
    this.roomSlugs = new Map(); // slug -> roomId
    this.roomUploadSizes = new Map(); // roomId -> total upload size in bytes
    this.MAX_ROOM_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB per room limit
  }
  
  // Track upload size for a room
  addUploadSize(roomId, size) {
    const currentSize = this.roomUploadSizes.get(roomId) || 0;
    this.roomUploadSizes.set(roomId, currentSize + size);
  }
  
  // Get total upload size for a room
  getRoomUploadSize(roomId) {
    return this.roomUploadSizes.get(roomId) || 0;
  }
  
  // Check if room can accept more uploads
  canAcceptUpload(roomId, size) {
    const currentSize = this.getRoomUploadSize(roomId);
    return (currentSize + size) <= this.MAX_ROOM_UPLOAD_SIZE;
  }

  // Room operations
  createOrJoinRoom(slug, userId, userName, userColor, maxUsers = null) {
    let roomId = this.roomSlugs.get(slug);
    let room;

    if (!roomId) {
      // Create new room
      roomId = nanoid();
      room = {
        id: roomId,
        slug,
        createdAt: new Date().toISOString(),
        participantCount: 0,
        maxUsers: maxUsers, // null means unlimited
      };
      this.rooms.set(roomId, room);
      this.roomSlugs.set(slug, roomId);
      this.roomMessages.set(roomId, []);
    } else {
      room = this.rooms.get(roomId);
    }

    // Add user
    this.addUser(userId, userName, userColor, roomId);
    room.participantCount = this.getOnlineUsers(roomId).length;

    return room;
  }

  getRoomSlug(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.slug : null;
  }

  isRoomFull(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.maxUsers === null) return false; // unlimited
    const currentUsers = this.getOnlineUsers(roomId).length;
    return currentUsers >= room.maxUsers;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomSlugByMessage(messageId) {
    const message = this.messages.get(messageId);
    if (message) {
      return this.getRoomSlug(message.room_id);
    }
    return null;
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      this.roomSlugs.delete(room.slug);
      
      // Delete all messages in room
      const messageIds = this.roomMessages.get(roomId) || [];
      messageIds.forEach(msgId => this.messages.delete(msgId));
      this.roomMessages.delete(roomId);
      
      // Remove room and upload tracking
      this.rooms.delete(roomId);
      this.roomUploadSizes.delete(roomId);
    }
  }

  // User operations
  addUser(userId, userName, userColor, roomId) {
    const user = {
      id: userId,
      name: userName,
      color: userColor,
      room_id: roomId,
      last_seen: new Date().toISOString(),
      is_typing: false,
      socketId: null,
    };
    this.users.set(userId, user);
    return user;
  }

  setUserSocket(userId, socketId, roomSlug) {
    const user = this.users.get(userId);
    if (user) {
      user.socketId = socketId;
      this.socketUsers.set(socketId, { userId, roomId: user.room_id });
    }
  }

  getUserBySocket(socketId) {
    return this.socketUsers.get(socketId);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  removeUser(userId) {
    const user = this.users.get(userId);
    if (user && user.socketId) {
      this.socketUsers.delete(user.socketId);
    }
    this.users.delete(userId);
  }

  getOnlineUsers(roomId) {
    const users = [];
    this.users.forEach(user => {
      if (user.room_id === roomId) {
        users.push({
          id: user.id,
          name: user.name,
          color: user.color,
          room_id: user.room_id,
          last_seen: user.last_seen,
          is_typing: user.is_typing,
        });
      }
    });
    return users;
  }

  updateTypingStatus(userId, isTyping) {
    const user = this.users.get(userId);
    if (user) {
      user.is_typing = isTyping;
    }
  }

  updateUserHeartbeat(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.last_seen = new Date().toISOString();
    }
  }

  cleanupInactiveUsers(maxInactiveMs = 30000) {
    const now = Date.now();
    const inactiveUsers = [];

    this.users.forEach((user, userId) => {
      const lastSeen = new Date(user.last_seen).getTime();
      if (now - lastSeen > maxInactiveMs) {
        inactiveUsers.push({ userId, roomId: user.room_id });
        this.removeUser(userId);
      }
    });

    return inactiveUsers;
  }

  // Message operations
  addMessage(roomId, messageData) {
    const messageId = nanoid();
    const message = {
      id: messageId,
      room_id: roomId,
      user_id: messageData.user_id,
      user_name: messageData.user_name,
      user_color: messageData.user_color,
      content: messageData.content,
      type: messageData.type || 'text',
      code_language: messageData.code_language,
      file_url: messageData.file_url,
      file_name: messageData.file_name,
      reply_to: messageData.reply_to,
      reactions: {},
      created_at: new Date().toISOString(),
    };

    this.messages.set(messageId, message);
    
    const roomMsgs = this.roomMessages.get(roomId) || [];
    roomMsgs.push(messageId);
    this.roomMessages.set(roomId, roomMsgs);

    return message;
  }

  getMessages(roomId) {
    const messageIds = this.roomMessages.get(roomId) || [];
    return messageIds.map(id => this.messages.get(id)).filter(Boolean);
  }

  addReaction(messageId, emoji, userId) {
    const message = this.messages.get(messageId);
    if (!message) return null;

    if (!message.reactions) {
      message.reactions = {};
    }

    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }

    const userIndex = message.reactions[emoji].indexOf(userId);
    if (userIndex === -1) {
      message.reactions[emoji].push(userId);
    } else {
      message.reactions[emoji].splice(userIndex, 1);
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
    }

    return message;
  }
}

module.exports = { InMemoryStorage };
