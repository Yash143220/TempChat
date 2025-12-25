# 🚀 Deployment Steps & Testing Guide

## Fixed Issues

### 1. ✅ Dashboard Shows Wrong Active Room Count
**Problem**: Dashboard showed 6 active rooms when there were none
**Solution**: 
- Changed dashboard API to fetch real-time stats from `/api/stats` endpoint
- `/api/stats` reads from in-memory storage (accurate)
- MongoDB logs are only for historical data

### 2. ✅ Logs Not Updating in Real-Time
**Problem**: Logs page wasn't receiving Socket.IO events
**Solution**:
- Added console logging to track events (🟢 created, 🔴 destroyed, 📊 stats)
- Improved Socket.IO connection handling
- Events now properly broadcast to all connected clients

### 3. ✅ Log Cleanup Changed to 7 Days
**Problem**: Logs were kept for 15 days
**Solution**:
- Changed MongoDB cleanup from 15 days to 7 days
- Runs automatically every 24 hours
- Deletes old RoomLog and UserActivity records

---

## Environment Variables Setup

### Create `.env.local` file:
```env
NODE_ENV=development
PORT=3000
ADMIN_PASSWORD=admin123
ALLOWED_ORIGINS=http://localhost:3000
MONGODB_URI=mongodb+srv://2330353_db_user:1f88wdjbB5mKuDaC@tempchat.tuzhybq.mongodb.net/?appName=tempchat

# Frontend admin password (for dashboard/logs)
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

**⚠️ IMPORTANT**: Use different passwords for production!

---

## Testing Guide

### 1. Start the Server

```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend
npm run dev
```

### 2. Test Dashboard Real-Time Updates

1. Open `http://localhost:3000/dashboard`
2. Enter password: `admin123`
3. Check console for: `✅ Dashboard connected to Socket.IO`
4. Note current "Active Rooms" count

5. In another tab/window, create a new room
6. Watch dashboard update automatically
7. Console should show: `📊 Dashboard received stats update: { activeRooms: X, totalUsers: Y }`

### 3. Test Logs Real-Time Updates

1. Open `http://localhost:3000/logs`
2. Enter password: `admin123`
3. Check console for: `✅ Connected to logs socket`

4. Create a room in another tab
5. Logs should show: 
   - ✅ Room created event
   - 📊 Stats update

6. Leave the room (close tab or click Leave)
7. Logs should show:
   - ❌ Room destroyed event
   - 📊 Stats update

### 4. Verify Console Logging

**Server console should show:**
```
🟢 Room created event emitted: { slug: 'test', creator: 'User123', ... }
📊 Stats update emitted after room join: { activeRooms: 1, totalUsers: 1, ... }
```

**Browser console should show:**
```
🟢 Room created event received: { slug: 'test', ... }
📊 Stats update received: { activeRooms: 1, totalUsers: 1 }
```

### 5. Test Password Protection

All three admin pages require password:
- `/dashboard` - Analytics & stats
- `/logs` - Real-time event logs
- `/room/admin` - Persistent admin chat room

Password: `admin123` (configurable in `.env.local`)

---

## Troubleshooting

### Dashboard shows wrong numbers
1. Check `/api/stats` endpoint: `http://localhost:3000/api/stats`
2. Should return: `{ activeRooms: X, totalUsers: Y, rooms: [...] }`
3. Verify server is running on port 3000
4. Check browser console for Socket.IO connection

### Logs not updating
1. Check browser console for connection: `✅ Connected to logs socket`
2. Check server console for events: `🟢 Room created event emitted`
3. Verify Socket.IO URL matches: should be `http://localhost:3000` in dev
4. Try refreshing the logs page

### Password not working
1. Check `.env.local` has `NEXT_PUBLIC_ADMIN_PASSWORD=admin123`
2. Restart Next.js dev server after changing `.env.local`
3. Clear browser cache/cookies

### "Room join timeout" error
1. Verify Socket.IO URL is correct (not port 3001)
2. Check server is running: `node server.js`
3. Check CORS settings in `.env.local`: `ALLOWED_ORIGINS=http://localhost:3000`

---

## Production Deployment

### Environment Variables for Production

**Backend (server.js):**
```env
NODE_ENV=production
PORT=3000
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD_HERE
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatapp
```

**Frontend (Next.js):**
```env
NODE_ENV=production
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
NEXT_PUBLIC_ADMIN_PASSWORD=YOUR_SECURE_PASSWORD_HERE
```

### Deploy to Render (Free Tier)

Follow [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) for complete guide.

**Quick checklist:**
1. Push code to GitHub
2. Create MongoDB Atlas cluster (free)
3. Deploy backend to Render
4. Deploy frontend to Render
5. Set environment variables on both services
6. Test all features

---

## API Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/api/health` | GET | Server health check | `{ status, uptime, memory, activeRooms, activeUsers }` |
| `/api/stats` | GET | **Real-time** active rooms/users | `{ activeRooms, totalUsers, rooms, timestamp }` |
| `/api/dashboard` | GET | Historical analytics data | Stats with graphs data |

---

## Socket.IO Events

### Client Receives (from server):

| Event | Data | Description |
|-------|------|-------------|
| `room-created` | `{ slug, creator, maxUsers, timestamp }` | New room created |
| `room-destroyed` | `{ slug, reason, timestamp }` | Room deleted |
| `room-stats-update` | `{ activeRooms, totalUsers, timestamp }` | Stats changed |
| `room-joined` | Room data | User joined room successfully |
| `user-joined` | User data | Someone joined your room |
| `user-left` | userId | Someone left your room |

### Server Receives (from client):

| Event | Data | Description |
|-------|------|-------------|
| `join-room` | `{ roomSlug, userId, userName, userColor, maxUsers, password }` | Join/create room |
| `leave-room` | `{ userId, roomId }` | Leave room |
| `send-message` | Message data | Send chat message |

---

## File Structure

```
e:/project2/
├── server.js                      # Socket.IO server (port 3000)
├── src/
│   ├── app/
│   │   ├── dashboard/page.tsx     # 🔐 Analytics dashboard
│   │   ├── logs/page.tsx          # 🔐 Real-time logs
│   │   ├── room/[slug]/page.tsx   # Chat room
│   │   └── api/
│   │       ├── stats/             # Real-time stats endpoint
│   │       └── dashboard/route.ts # Historical analytics
│   ├── lib/
│   │   ├── supabase.ts            # Socket.IO client config
│   │   ├── inMemoryStorage.js     # In-memory data store
│   │   └── security.js            # Validation & rate limiting
│   └── store/
│       └── userStore.ts           # Client state management
├── .env.local                     # Your secrets (git-ignored)
└── .env.example                   # Template
```

---

## Security Features

✅ Password protection (dashboard, logs, admin room)  
✅ Rate limiting (messages, joins, uploads)  
✅ Input validation & sanitization  
✅ XSS protection  
✅ CORS whitelist  
✅ PDF content scanning  
✅ File upload limits (25MB per file, 100MB per room)  
✅ Malicious content detection  
✅ Password hashing (bcrypt)  

---

## Support & Documentation

- [README.md](README.md) - Project overview
- [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) - Deploy to Render (free)
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - All deployment options
- [SECURITY.md](SECURITY.md) - Security features
- [PRODUCTION.md](PRODUCTION.md) - Production best practices

---

## Quick Commands

```bash
# Development
node server.js                # Start backend (port 3000)
npm run dev                   # Start frontend (also port 3000)

# Build for production
npm run build                 # Build Next.js
npm start                     # Start Next.js production server

# MongoDB
mongod                        # Start local MongoDB (optional)

# Testing
curl http://localhost:3000/api/health
curl http://localhost:3000/api/stats
```

---

**Last Updated**: December 25, 2025  
**Status**: ✅ All issues fixed and tested
