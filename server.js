const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { InMemoryStorage } = require('./src/lib/inMemoryStorage');
const { connectDB } = require('./src/lib/mongodb');
const { AdminMessage, RoomLog, UserActivity } = require('./src/lib/models');
const bcrypt = require('bcryptjs');
const compression = require('compression');
const {
  validateMessage,
  validateUsername,
  validateRoomSlug,
  validateMaxUsers,
  validateColor,
  validatePDFContent,
  RateLimiter,
  sanitizeHTML
} = require('./src/lib/security');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const ADMIN_ROOM_SLUG = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

// Allowed CORS origins (configurable via environment)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (dev ? ['http://localhost:3000'] : ['*']);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize in-memory storage
const storage = new InMemoryStorage();

// Rate limiters (relaxed for better user experience)
const messageRateLimiter = new RateLimiter(60, 60000); // 60 messages per minute
const joinRateLimiter = new RateLimiter(30, 60000); // 30 room joins per minute
const connectionRateLimiter = new RateLimiter(50, 60000); // 50 connections per minute
const uploadRateLimiter = new RateLimiter(5, 60000); // 5 file uploads per minute per IP

// Cleanup rate limiters every 5 minutes
setInterval(() => {
  messageRateLimiter.cleanup();
  joinRateLimiter.cleanup();
  connectionRateLimiter.cleanup();
  uploadRateLimiter.cleanup();
}, 5 * 60 * 1000);

// Helper functions for logging
async function logRoomAction(roomSlug, roomId, action, userId = null, userName = null, maxUsers = null, participantCount = 0) {
  try {
    await RoomLog.create({
      roomSlug,
      roomId,
      action,
      userId,
      userName,
      maxUsers,
      participantCount,
    });
  } catch (error) {
    console.error('Error logging room action:', error);
  }
}

async function logUserActivity(userId, userName, action, roomSlug = null, details = {}) {
  try {
    await UserActivity.create({
      userId,
      userName,
      action,
      roomSlug,
      details,
    });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
}

// Cleanup logs older than 15 days
async function cleanupOldLogs() {
  try {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const roomResult = await RoomLog.deleteMany({ timestamp: { $lt: fifteenDaysAgo } });
    const activityResult = await UserActivity.deleteMany({ timestamp: { $lt: fifteenDaysAgo } });
    console.log(`🧹 Cleaned up ${roomResult.deletedCount} room logs and ${activityResult.deletedCount} activity logs`);
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
  }
}

app.prepare().then(async () => {
  // Connect to MongoDB
  await connectDB();
  
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Health check endpoint
      if (parsedUrl.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          activeRooms: storage.rooms.size,
          activeUsers: storage.users.size,
        }));
        return;
      }

      // Real-time stats endpoint
      if (parsedUrl.pathname === '/api/stats') {
        const rooms = Array.from(storage.rooms.entries()).map(([slug, room]) => ({
          slug,
          userCount: room.users?.length || 0,
          maxUsers: room.maxUsers,
          createdAt: room.createdAt,
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          activeRooms: storage.rooms.size,
          totalUsers: storage.users.size,
          rooms: rooms.filter(r => r.userCount > 0),
          timestamp: new Date().toISOString(),
        }));
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 3e7, // 30MB max message size (increased for PDF support)
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    const clientIP = socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limit connections
    if (!connectionRateLimiter.isAllowed(clientIP)) {
      console.warn(`Connection rate limit exceeded for ${clientIP}`);
      socket.disconnect(true);
      return;
    }
    
    console.log('Client connected:', socket.id, 'from', clientIP);

    // Immediately send current stats to newly connected client
    socket.emit('room-stats-update', {
      activeRooms: storage.rooms.size,
      totalUsers: storage.users.size,
      timestamp: new Date().toISOString(),
    });

    // Join room
    socket.on('join-room', async ({ roomSlug, userId, userName, userColor, maxUsers, password }) => {
      try {
        // Rate limit joins
        if (!joinRateLimiter.isAllowed(clientIP)) {
          socket.emit('error', { message: 'Too many requests. Please slow down.' });
          return;
        }
        
        // Validate inputs
        const slugValidation = validateRoomSlug(roomSlug);
        if (!slugValidation.valid) {
          socket.emit('error', { message: slugValidation.error });
          return;
        }
        
        const usernameValidation = validateUsername(userName);
        if (!usernameValidation.valid) {
          socket.emit('error', { message: usernameValidation.error });
          return;
        }
        
        const colorValidation = validateColor(userColor);
        if (!colorValidation.valid) {
          socket.emit('error', { message: colorValidation.error });
          return;
        }
        
        const maxUsersValidation = validateMaxUsers(maxUsers);
        if (!maxUsersValidation.valid) {
          socket.emit('error', { message: maxUsersValidation.error });
          return;
        }
        
        const sanitizedSlug = slugValidation.sanitized;
        const sanitizedUsername = usernameValidation.sanitized;
        const sanitizedColor = colorValidation.sanitized;
        const sanitizedMaxUsers = maxUsersValidation.sanitized;
        
        // Check if admin room
        const isAdminRoom = sanitizedSlug === ADMIN_ROOM_SLUG;
        let room;
        
        if (isAdminRoom) {
          // Verify password
          if (!password || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
            socket.emit('auth-failed', { message: 'Invalid admin password' });
            return;
          }
          
          // Load admin messages from MongoDB
          const adminMessages = await AdminMessage.find().sort({ createdAt: 1 }).limit(1000);
          const formattedMessages = adminMessages.map(msg => ({
            id: msg.messageId,
            room_id: ADMIN_ROOM_SLUG,
            user_id: msg.userId,
            user_name: msg.userName,
            user_color: msg.userColor,
            content: msg.content,
            type: msg.type,
            code_language: msg.codeLanguage,
            file_url: msg.fileUrl,
            file_name: msg.fileName,
            reply_to: msg.replyTo,
            reactions: msg.reactions,
            created_at: msg.createdAt.toISOString(),
          }));
          
          // Create/join admin room
          room = storage.createOrJoinRoom(sanitizedSlug, userId, sanitizedUsername, sanitizedColor, null);
          socket.join(sanitizedSlug);
          storage.setUserSocket(userId, socket.id, sanitizedSlug);
          
          // Send admin room data
          socket.emit('room-joined', {
            roomId: room.id,
            messages: formattedMessages,
            users: storage.getOnlineUsers(room.id),
            maxUsers: null,
            isAdmin: true,
          });

          // Broadcast room stats update
          const statsUpdate = {
            activeRooms: storage.rooms.size,
            totalUsers: storage.users.size,
            timestamp: new Date().toISOString(),
          };
          io.emit('room-stats-update', statsUpdate);
          console.log('📊 Stats update emitted after admin room join:', statsUpdate);
          
          // Log activity
          await logUserActivity(userId, sanitizedUsername, 'joined_admin', sanitizedSlug);
        } else {
          // Regular room logic
          const existingRoomId = storage.roomSlugs.get(sanitizedSlug);
          if (existingRoomId && storage.isRoomFull(existingRoomId)) {
            socket.emit('room-full', { message: 'Room is full' });
            return;
          }
          
          const isNewRoom = !existingRoomId;
          room = storage.createOrJoinRoom(sanitizedSlug, userId, sanitizedUsername, sanitizedColor, sanitizedMaxUsers);
          
          socket.join(sanitizedSlug);
          storage.setUserSocket(userId, socket.id, sanitizedSlug);
          
          // Log room creation
          if (isNewRoom) {
            await logRoomAction(sanitizedSlug, room.id, 'created', userId, sanitizedUsername, sanitizedMaxUsers, 1);
            
            // Broadcast room creation event
            const roomCreatedEvent = {
              slug: sanitizedSlug,
              creator: sanitizedUsername,
              maxUsers: sanitizedMaxUsers,
              timestamp: new Date().toISOString(),
            };
            io.emit('room-created', roomCreatedEvent);
            console.log('🟢 Room created event emitted:', roomCreatedEvent);
          } else {
            await logRoomAction(sanitizedSlug, room.id, 'joined', userId, sanitizedUsername, null, storage.getOnlineUsers(room.id).length);
          }

          // Broadcast room stats update
          io.emit('room-stats-update', {
            activeRooms: storage.rooms.size,
            totalUsers: storage.users.size,
            timestamp: new Date().toISOString(),
          });
          
          // Send room data to user
          socket.emit('room-joined', {
            roomId: room.id,
            messages: storage.getMessages(room.id),
            users: storage.getOnlineUsers(room.id),
            maxUsers: room.maxUsers,
            isAdmin: false,
          });
        }
        
        // Notify others in room
        socket.to(sanitizedSlug).emit('user-joined', storage.getUser(userId));
        
        // Send updated user list to all
        io.to(sanitizedSlug).emit('users-updated', storage.getOnlineUsers(room.id));
        
        console.log(`User ${sanitizedUsername} joined room ${sanitizedSlug}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Send message
    socket.on('send-message', async ({ roomId, message }) => {
      try {
        // Rate limit messages
        const userInfo = storage.getUserBySocket(socket.id);
        if (!userInfo) {
          socket.emit('error', { message: 'User not found' });
          return;
        }
        
        if (!messageRateLimiter.isAllowed(userInfo.userId)) {
          socket.emit('error', { message: 'Too many messages. Please slow down.' });
          return;
        }
        
        // Validate message content
        const validation = validateMessage(message.content, message.type);
        if (!validation.valid) {
          socket.emit('error', { message: validation.error });
          return;
        }
        
        // Additional validation for file uploads (images/PDFs)
        if (message.type === 'file' || message.type === 'image') {
          const clientIP = socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'unknown';
          
          // Rate limit file uploads
          if (!uploadRateLimiter.isAllowed(clientIP)) {
            socket.emit('error', { message: 'Too many file uploads. Please wait before uploading again.' });
            return;
          }
          
          // Validate PDF content if it's a PDF file
          if (message.file_url && message.file_url.includes('application/pdf')) {
            const pdfValidation = validatePDFContent(message.file_url);
            if (!pdfValidation.valid) {
              socket.emit('error', { message: pdfValidation.error });
              return;
            }
            
            // Check room upload size limit
            const uploadSize = pdfValidation.size || 0;
            if (!storage.canAcceptUpload(roomId, uploadSize)) {
              socket.emit('error', { message: 'Room storage limit reached (100MB). Please create a new room or wait for users to leave.' });
              return;
            }
            
            // Track upload size
            storage.addUploadSize(roomId, uploadSize);
          }
        }
        
        // Create sanitized message object
        const sanitizedMessage = {
          ...message,
          content: validation.sanitized,
          user_name: sanitizeHTML(message.user_name || ''),
        };
        
        const newMessage = storage.addMessage(roomId, sanitizedMessage);
        const roomSlug = storage.getRoomSlug(roomId);
        
        // If admin room, save to MongoDB
        if (roomSlug === ADMIN_ROOM_SLUG) {
          await AdminMessage.create({
            messageId: newMessage.id,
            userId: newMessage.user_id,
            userName: newMessage.user_name,
            userColor: newMessage.user_color,
            content: newMessage.content,
            type: newMessage.type,
            codeLanguage: newMessage.code_language,
            fileUrl: newMessage.file_url,
            fileName: newMessage.file_name,
            replyTo: newMessage.reply_to,
            reactions: newMessage.reactions,
          });
        }
        
        io.to(roomSlug).emit('new-message', newMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ roomId, userId, isTyping }) => {
      try {
        storage.updateTypingStatus(userId, isTyping);
        const roomSlug = storage.getRoomSlug(roomId);
        socket.to(roomSlug).emit('user-typing', { userId, isTyping });
      } catch (error) {
        console.error('Error updating typing:', error);
      }
    });

    // Add reaction
    socket.on('add-reaction', ({ messageId, emoji, userId }) => {
      try {
        const message = storage.addReaction(messageId, emoji, userId);
        const roomSlug = storage.getRoomSlugByMessage(messageId);
        if (roomSlug) {
          io.to(roomSlug).emit('message-updated', message);
        }
      } catch (error) {
        console.error('Error adding reaction:', error);
      }
    });

    // Heartbeat
    socket.on('heartbeat', ({ userId }) => {
      try {
        storage.updateUserHeartbeat(userId);
      } catch (error) {
        console.error('Error updating heartbeat:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      try {
        const userInfo = storage.getUserBySocket(socket.id);
        if (userInfo) {
          const { userId, roomId } = userInfo;
          storage.removeUser(userId);
          
          const roomSlug = storage.getRoomSlug(roomId);
          if (roomSlug) {
            // Notify others
            socket.to(roomSlug).emit('user-left', userId);
            
            // Send updated user list
            const users = storage.getOnlineUsers(roomId);
            io.to(roomSlug).emit('users-updated', users);
            
            // Clean up empty room - ONLY when ALL users have left
            // Messages persist as long as at least one user remains
            if (users.length === 0) {
              storage.deleteRoom(roomId);
              console.log(`Room ${roomSlug} deleted (empty - all users left)`);
            }
          }
          
          console.log(`User ${userId} disconnected`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Leave room explicitly
    socket.on('leave-room', ({ userId, roomId }) => {
      try {
        const roomSlug = storage.getRoomSlug(roomId);
        storage.removeUser(userId);
        
        if (roomSlug) {
          socket.leave(roomSlug);
          socket.to(roomSlug).emit('user-left', userId);
          
          const users = storage.getOnlineUsers(roomId);
          io.to(roomSlug).emit('users-updated', users);
          
          if (users.length === 0) {
            storage.deleteRoom(roomId);
            console.log(`Room ${roomSlug} deleted (empty)`);
            
            // Broadcast room destroyed event
            const roomDestroyedEvent = {
              slug: roomSlug,
              reason: 'empty',
              timestamp: new Date().toISOString(),
            };
            io.emit('room-destroyed', roomDestroyedEvent);
            console.log('🔴 Room destroyed event emitted:', roomDestroyedEvent);

            // Broadcast room stats update
            const statsUpdate = {
              activeRooms: storage.rooms.size,
              totalUsers: storage.users.size,
              timestamp: new Date().toISOString(),
            };
            io.emit('room-stats-update', statsUpdate);
            console.log('📊 Stats update emitted:', statsUpdate);
          } else {
            // Broadcast room stats update (user count changed)
            const statsUpdate = {
              activeRooms: storage.rooms.size,
              totalUsers: storage.users.size,
              timestamp: new Date().toISOString(),
            };
            io.emit('room-stats-update', statsUpdate);
            console.log('📊 Stats update emitted after user leave:', statsUpdate);
          }
        }
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });
  });

  // Cleanup inactive users every 30 seconds
  setInterval(() => {
    const inactiveUsers = storage.cleanupInactiveUsers(30000); // 30 seconds
    inactiveUsers.forEach(({ userId, roomId }) => {
      const roomSlug = storage.getRoomSlug(roomId);
      if (roomSlug) {
        io.to(roomSlug).emit('user-left', userId);
        const users = storage.getOnlineUsers(roomId);
        io.to(roomSlug).emit('users-updated', users);
        
        if (users.length === 0 && roomSlug !== ADMIN_ROOM_SLUG) {
          storage.deleteRoom(roomId);
          console.log(`Room ${roomSlug} deleted (empty - all users left)`);
          
          // Broadcast room destroyed event
          const roomDestroyedEvent = {
            slug: roomSlug,
            reason: 'inactive',
            timestamp: new Date().toISOString(),
          };
          io.emit('room-destroyed', roomDestroyedEvent);
          console.log('🔴 Room destroyed event emitted (inactive):', roomDestroyedEvent);

          // Broadcast room stats update
          const statsUpdate = {
            activeRooms: storage.rooms.size,
            totalUsers: storage.users.size,
            timestamp: new Date().toISOString(),
          };
          io.emit('room-stats-update', statsUpdate);
          console.log('📊 Stats update emitted after inactive cleanup:', statsUpdate);
        }
      }
    });
  }, 30000);

  // Cleanup old logs every 24 hours
  cleanupOldLogs(); // Run on startup
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`✅ Ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.IO server running`);
      console.log(`🌍 Environment: ${dev ? 'development' : 'production'}`);
      console.log(`🔒 CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    });
  
  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
    
    // Close Socket.IO connections
    io.close(() => {
      console.log('🔌 Socket.IO connections closed');
    });
    
    // Close HTTP server
    httpServer.close(() => {
      console.log('🌐 HTTP server closed');
      
      // Close database connection
      const mongoose = require('mongoose');
      mongoose.connection.close(false, () => {
        console.log('💾 MongoDB connection closed');
        console.log('👋 Process terminated');
        process.exit(0);
      });
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('⏰ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
  
  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}).catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
