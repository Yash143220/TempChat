# 🚀 Pre-Deployment Checklist

## ⚠️ CRITICAL - Do These BEFORE Deploying

### 1. Create `.env.local` File (Git-Ignored)
Copy from `.env.local.example` and set your secrets:
```env
NODE_ENV=production
PORT=3000
ADMIN_PASSWORD=CREATE_A_STRONG_PASSWORD_HERE_MIN_16_CHARS
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
NEXT_PUBLIC_ADMIN_PASSWORD=SAME_AS_ADMIN_PASSWORD_OR_DIFFERENT
```

### 2. Verify `.gitignore` Contains:
```
.env*.local
.env
```

### 3. Remove Test/Debug Code
- [x] Console.log statements are fine (helpful for debugging)
- [x] No hardcoded passwords in source code
- [x] No exposed MongoDB credentials

### 4. Update Production URLs
Replace in deployment platform:
- `ALLOWED_ORIGINS`: Your actual domain
- `NEXT_PUBLIC_SOCKET_URL`: Your backend URL (if separate)

---

## ✅ Ready to Deploy Features

✅ **Security Hardened**
- Password hashing (bcrypt)
- Rate limiting (messages, uploads, joins)
- Input validation & sanitization
- XSS protection
- CORS whitelist
- PDF content validation
- Upload limits (25MB/file, 100MB/room)

✅ **Production Features**
- MongoDB Atlas support
- Real-time Socket.IO
- Ephemeral rooms (auto-delete)
- Persistent admin room
- File uploads (images, PDFs)
- Analytics dashboard (password-protected)
- Real-time logs (password-protected)
- Health check endpoint (`/api/health`)

✅ **Performance**
- In-memory storage (fast)
- Compression enabled
- Socket.IO optimizations
- Automatic cleanup (7-day old logs)
- Inactive user cleanup (30 seconds)

---

## 🌐 Deployment Options

### Option 1: Railway (Easiest - $5-10/month)
1. Push to GitHub
2. Connect Railway to repo
3. Add MongoDB from Railway
4. Set environment variables
5. Deploy!

See [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) for detailed steps.

### Option 2: Render (Free Tier - with cold starts)
1. Push to GitHub
2. Create MongoDB Atlas (free)
3. Deploy backend service
4. Deploy frontend service
5. Set environment variables

See [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) for detailed steps.

### Option 3: VPS (Full Control - $5/month)
1. Setup Ubuntu server
2. Install Docker
3. Deploy with docker-compose
4. Setup nginx reverse proxy
5. Add SSL with Let's Encrypt

See [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) Section 4.

---

## 🔒 Security Checklist

- [ ] Changed `ADMIN_PASSWORD` from default
- [ ] Changed `NEXT_PUBLIC_ADMIN_PASSWORD` from default
- [ ] MongoDB credentials secured (not in git)
- [ ] CORS whitelist updated for production domain
- [ ] `.env.local` file created and NOT committed to git
- [ ] Strong passwords (min 16 characters, mixed case, numbers, symbols)
- [ ] MongoDB IP whitelist configured (or 0.0.0.0/0 for cloud platforms)

---

## 🧪 Pre-Deployment Testing

### Test Locally in Production Mode:
```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production node server.js &
npm start
```

### Test Checklist:
- [ ] Create room and send messages
- [ ] Upload image file
- [ ] Upload PDF file
- [ ] Multiple users in same room
- [ ] Room auto-deletes when empty
- [ ] Admin room persists (password: your password)
- [ ] Dashboard shows stats (password: your password)
- [ ] Logs show real-time events (password: your password)
- [ ] Rate limiting works (try spamming)
- [ ] File upload limits work (try >25MB file)

---

## 📊 Post-Deployment Verification

### 1. Check Health Endpoint
```bash
curl https://your-domain.com/api/health
```
Should return:
```json
{
  "status": "ok",
  "uptime": 12345,
  "memory": {...},
  "activeRooms": 0,
  "activeUsers": 0
}
```

### 2. Test Socket.IO Connection
- Open browser console on your site
- Look for: `✅ Dashboard connected to Socket.IO`
- Create a room, verify dashboard updates

### 3. Monitor Logs
- Check server logs for errors
- Watch for connection issues
- Monitor memory usage

### 4. Test from Different Devices
- Desktop browser
- Mobile browser
- Different networks
- Incognito mode

---

## 🐛 Common Deployment Issues

### "Socket.IO not connecting"
**Fix:**
1. Check `ALLOWED_ORIGINS` includes your domain
2. Verify `NEXT_PUBLIC_SOCKET_URL` points to backend
3. Check CORS errors in browser console

### "Admin password not working"
**Fix:**
1. Verify `ADMIN_PASSWORD` set in backend env vars
2. Verify `NEXT_PUBLIC_ADMIN_PASSWORD` set in frontend env vars
3. Restart services after changing env vars

### "MongoDB connection failed"
**Fix:**
1. Check `MONGODB_URI` format
2. Verify IP whitelist includes deployment IP (or 0.0.0.0/0)
3. Test connection string locally first
4. Check MongoDB Atlas allows connections

### "Rate limit too strict"
**Fix:**
Adjust in `server.js`:
```javascript
const messageRateLimiter = new RateLimiter(60, 60000); // 60 per minute
const joinRateLimiter = new RateLimiter(30, 60000);    // 30 per minute
```

---

## 📝 Environment Variables Quick Reference

### Backend (server.js)
```env
NODE_ENV=production
PORT=3000
ADMIN_PASSWORD=your-secure-password
ALLOWED_ORIGINS=https://your-domain.com
MONGODB_URI=mongodb+srv://...
```

### Frontend (Next.js)
```env
NODE_ENV=production
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-password
```

---

## 🎯 Performance Tips

### For Free Tier (Render)
- Use UptimeRobot to ping every 5 minutes (keeps warm)
- Accept 30-60 second cold start on first request

### For Production
- Use Redis for horizontal scaling (multiple servers)
- Enable MongoDB Atlas backups
- Setup monitoring (Datadog, New Relic, etc.)
- Configure CDN for static assets

---

## 📚 Documentation

- [README.md](README.md) - Project overview
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Full deployment guide
- [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) - Free tier deployment
- [SECURITY.md](SECURITY.md) - Security features
- [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) - Testing guide

---

## ✨ You're Ready!

Once you've completed the checklist above, your app is production-ready!

**Quick Deploy Command (Railway):**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Quick Deploy Command (Render):**
1. Push to GitHub
2. Import on Render.com
3. Add env vars
4. Deploy!

Good luck! 🚀
