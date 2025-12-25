const mongoose = require('mongoose');

// Admin Chat Message Schema
const adminMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userColor: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'text', enum: ['text', 'code', 'image', 'file'] },
  codeLanguage: String,
  fileUrl: String,
  fileName: String,
  replyTo: String,
  reactions: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

// Room Analytics Log Schema
const roomLogSchema = new mongoose.Schema({
  roomSlug: { type: String, required: true },
  roomId: { type: String, required: true },
  action: { type: String, required: true, enum: ['created', 'joined', 'left', 'deleted'] },
  userId: String,
  userName: String,
  maxUsers: Number,
  participantCount: Number,
  timestamp: { type: Date, default: Date.now },
});

// User Activity Log Schema  
const userActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  roomSlug: String,
  details: Object,
  timestamp: { type: Date, default: Date.now },
});

// Create indexes for faster queries
roomLogSchema.index({ timestamp: 1 });
userActivitySchema.index({ timestamp: 1 });
adminMessageSchema.index({ createdAt: 1 });

const AdminMessage = mongoose.models.AdminMessage || mongoose.model('AdminMessage', adminMessageSchema);
const RoomLog = mongoose.models.RoomLog || mongoose.model('RoomLog', roomLogSchema);
const UserActivity = mongoose.models.UserActivity || mongoose.model('UserActivity', userActivitySchema);

module.exports = { AdminMessage, RoomLog, UserActivity };
