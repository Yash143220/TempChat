# Chat. Close. Gone. 💬

A **production-ready**, ephemeral, privacy-focused chat application with enterprise-grade security. Messages self-destruct when everyone leaves the room - truly ephemeral with in-memory storage for regular rooms and persistent MongoDB for admin room.

## ✨ Features

### Core Functionality
- 🚀 **Instant Room Creation** - Create rooms with custom names
- 🔗 **Shareable Links** - One-click invite link copying
- 👤 **Anonymous** - No accounts required, just pick a nickname
- 💨 **Ephemeral** - Regular rooms stored in RAM, auto-delete when all users leave
- 🔐 **Admin Room** - Password-protected persistent room with MongoDB storage
- 👥 **User Limits** - Optional room capacity controls
- 📊 **Analytics Dashboard** - Real-time statistics and graphs
- 🌓 **Dark/Light Theme** - Seamless theme switching

### Real-time Communication
- ⚡ **Live Messaging** - WebSocket-based real-time chat via Socket.IO
- 👥 **Online Presence** - See who's in the room with colored avatars
- ⌨️ **Typing Indicators** - Know when others are composing messages
- 🕐 **Timestamps** - Relative time display (e.g., "2 min ago")
- 🔗 **Clickable Links** - Auto-detect and linkify URLs in messages

### Rich Content Sharing
- 💻 **Code Snippets** - Syntax-highlighted code blocks with 20+ languages
- 📋 **Copy Code** - One-click code copying
- 🖼️ **Image Sharing** - Drag-and-drop image uploads with inline previews

### Engagement Features
- 😊 **Emoji Reactions** - Quick reactions (👍 😂 🔥 ❤️ 👀 ✨)
- 💬 **Reply Threading** - Reply to specific messages
- 📌 **Quote Replies** - Quote previous messages in replies

### 🔒 Production Security Features
- ✅ **Input Validation** - All user inputs validated and sanitized
- ✅ **Rate Limiting** - Protection against spam and DDoS
- ✅ **CORS Protection** - Whitelist-based origin control
- ✅ **XSS Prevention** - HTML sanitization on all content
- ✅ **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- ✅ **File Validation** - Type and size limits for uploads
- ✅ **Password Hashing** - bcrypt for admin authentication
- ✅ **Graceful Shutdown** - Proper cleanup on termination
- ✅ **Health Monitoring** - `/api/health` endpoint

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS 3
- **Backend**: Socket.IO + Custom Node.js Server
- **Storage**: 
  - In-Memory (RAM) for regular ephemeral rooms
  - MongoDB for admin room and analytics
- **Security**: Input validation, rate limiting, CORS, bcrypt
- **State Management**: Zustand with selective localStorage persistence
- **Code Highlighting**: react-syntax-highlighter with Prism.js
- **Date Formatting**: date-fns
- **Performance**: Compression, HTTP/2, optimized builds

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5.0+ (for admin room and analytics)

### Installation

```bash
# Navigate to project directory
cd project2

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your settings
# IMPORTANT: Change ADMIN_PASSWORD and configure MONGODB_URI
```

### Environment Variables

```env
NODE_ENV=development
HOST=localhost
PORT=3000
ADMIN_PASSWORD=your_strong_password_here
MONGODB_URI=mongodb://localhost:27017/chatapp
ALLOWED_ORIGINS=http://localhost:3000
```

### Start MongoDB

```bash
# Start MongoDB service
mongod

# Or with Docker
docker run -d -p 27017:27017 --name mongodb mongo:6
```

### Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Open Browser

Visit [http://localhost:3000](http://localhost:3000) 🎉

**🔐 Admin Room**: [http://localhost:3000/room/admin](http://localhost:3000/room/admin) (password: admin123)

**📊 Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## 📁 Project Structure

```
project2/
├── server.js                     # Production-ready Socket.IO server with security
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── room/[slug]/
│   │   │   └── page.tsx          # Chat room page with admin support
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Analytics dashboard
│   │   ├── api/
│   │   │   └── dashboard/        # Dashboard API
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── ChatMessage.tsx       # Message component with link detection
│   │   ├── MessageInput.tsx      # Message input with typing indicators
│   │   ├── OnlineUsers.tsx       # Sidebar with online users
│   │   ├── CodeModal.tsx         # Code snippet modal
│   │   ├── ImageModal.tsx        # Image upload modal
│   │   └── ThemeProvider.tsx     # Theme management
│   ├── lib/
│   │   ├── roomManager.ts        # Socket.IO client setup
│   │   ├── inMemoryStorage.js    # RAM-based ephemeral storage
│   │   ├── mongodb.js            # MongoDB connection
│   │   ├── models.js             # Mongoose schemas
│   │   └── security.js           # Input validation & sanitization
│   └── store/
│       └── userStore.ts          # Global state (Zustand)
├── .env.example                  # Environment variables template
├── package.json
├── next.config.js                # Production security headers
├── PRODUCTION.md                 # Comprehensive deployment guide
└── tsconfig.json
```

## 🎮 How to Use

### Creating a Room

1. Visit homepage
2. Enter a custom room name
3. (Optional) Set max users limit
4. Click **"Create Room"**
5. Enter your nickname when prompted
6. Share the URL with others

### Joining a Room

**Method 1:** Use the homepage
- Enter room name
- Click "Join Room"

**Method 2:** Direct URL access
- Visit `http://localhost:3000/room/your-room-name`
- Enter your nickname

**Method 3:** Admin Room
- Visit `http://localhost:3000/room/admin`
- Enter admin password (default: admin123)
- Messages persist in MongoDB

### Sending Messages

- **Text**: Type and press Enter (Shift+Enter for new line)
- **Code**: Click code icon (`</>`) → Select language → Paste code
- **Image**: Click image icon → Upload or paste URL → Add optional caption
- **Links**: URLs are automatically clickable

### Viewing Analytics

- Visit [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- See real-time statistics:
  - Total rooms created
  - Active rooms
  - Rooms per minute/hour/day
  - Most popular rooms
  - User activity metrics

### Rate Limits

- **Connections**: 20 per minute per IP
- **Room Joins**: 10 per minute per IP  
- **Messages**: 30 per minute per user

## 🔒 Security & Privacy

### Input Validation
- ✅ All user inputs validated and sanitized
- ✅ Maximum lengths enforced (messages: 10k chars, usernames: 50 chars)
- ✅ XSS prevention through HTML sanitization
- ✅ File type and size validation (10MB max, images only)

### Privacy Features
- ✅ No user accounts or registration required
- ✅ Regular rooms stored in RAM only - never saved to disk
- ✅ Messages auto-delete when all users leave
- ✅ Admin room: persistent but password-protected
- ✅ 15-day automatic log cleanup
- ⚠️ **Note**: Don't share sensitive data in regular rooms

### Production Security
- ✅ CORS whitelist protection
- ✅ Rate limiting against spam/DDoS
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Password hashing with bcrypt
- ✅ Graceful shutdown handling
- ✅ Health monitoring endpoint
- ✅ Error logging and handling

See [PRODUCTION.md](PRODUCTION.md) for complete deployment guide.

## 🎨 Customization

### Adding New Languages for Code Highlighting

Edit [src/components/CodeModal.tsx](src/components/CodeModal.tsx):

```typescript
const LANGUAGES = [
  'javascript', 'python', 'your-new-language', // Add here
];
```


### Changing Theme Colors

Edit [tailwind.config.ts](tailwind.config.ts):

```typescript
colors: {
  primary: {
    light: '#a78bfa',    // Light purple
    DEFAULT: '#8b5cf6',  // Default purple
    dark: '#7c3aed',     // Dark purple
  },
}
```

## 🐛 Troubleshooting

### Messages not appearing in real-time

- Check if server is running (`npm run dev`)
- Verify browser console for Socket.IO connection errors
- Ensure port 3000 is not blocked by firewall

### "Failed to join room" error

- Restart the server
- Clear browser localStorage
- Try a different browser

### Images not loading

- For external URLs, ensure they allow CORS
- Check file size is reasonable
- Verify network connection

## 📦 Deployment

### Deploy Server

For production deployment, you'll need a platform that supports Node.js servers:

**Railway / Render:**
1. Connect your GitHub repository
2. Set build command: `npm install && npm run build`
3. Set start command: `npm start`
4. Deploy!

**Note**: Since this uses in-memory storage, all messages are lost on server restart. This is by design for maximum privacy.

## 🤝 Contributing

Contributions welcome:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 💡 Future Enhancements

- [ ] Voice messages
- [ ] Custom emoji reactions
- [ ] Message search
- [ ] Export chat history (before leaving)
- [ ] Room password protection
- [ ] Custom themes
- [ ] File sharing
- [ ] Message edit/delete

## 📄 License

MIT License - feel free to use for personal or educational projects!

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Real-time powered by [Socket.IO](https://socket.io/)
- Icons from [Heroicons](https://heroicons.com/)
- Code highlighting by [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

---

**Made for students who need quick, private conversations** ✨

