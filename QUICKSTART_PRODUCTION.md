# 🚀 Quick Start - Production Deployment

## ⚡ 5-Minute Setup

### 1. Environment Setup (2 minutes)

```bash
# Copy environment template
cp .env.example .env.local

# Edit the file with your settings
# REQUIRED CHANGES:
# - ADMIN_PASSWORD: Change from 'admin123' to a strong password
# - MONGODB_URI: Your MongoDB connection string
# - ALLOWED_ORIGINS: Your domain(s)
```

**Example `.env.local`**:
```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
ADMIN_PASSWORD=MyStr0ng!P@ssw0rd2025
MONGODB_URI=mongodb://chatuser:securepass@localhost:27017/chatapp
ALLOWED_ORIGINS=https://chat.yourdomain.com
```

### 2. MongoDB Setup (2 minutes)

```bash
# Start MongoDB
mongod

# Or with Docker
docker run -d -p 27017:27017 --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=securepassword \
  mongo:6
```

### 3. Build & Start (1 minute)

```bash
# Install dependencies (if not done)
npm install

# Build for production
npm run build

# Start server
npm start

# Or with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name chat-app
pm2 save
```

### 4. Verify (30 seconds)

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":..., ...}
```

---

## ✅ Pre-Launch Checklist

Copy and check before going live:

```
[ ] Changed ADMIN_PASSWORD from default
[ ] Configured ALLOWED_ORIGINS with your domain
[ ] MongoDB authentication enabled
[ ] SSL certificate installed (Let's Encrypt)
[ ] Nginx reverse proxy configured
[ ] Firewall rules set (allow 80, 443, 22 only)
[ ] PM2 or systemd configured for auto-restart
[ ] Monitoring setup (UptimeRobot/Pingdom)
[ ] Backup strategy configured
[ ] Tested rate limiting
[ ] Health endpoint returns 200 OK
```

---

## 🌐 Nginx Configuration

**File**: `/etc/nginx/sites-available/chatapp`

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d chat.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 📊 Monitoring Commands

```bash
# PM2 monitoring
pm2 logs chat-app        # View logs
pm2 monit               # Live monitoring
pm2 restart chat-app    # Restart app
pm2 stop chat-app       # Stop app

# System monitoring
htop                    # CPU/Memory
df -h                   # Disk space
free -h                 # Memory usage

# MongoDB monitoring
mongo --eval "db.stats()"  # Database stats
```

---

## 🆘 Quick Troubleshooting

### Server won't start
```bash
# Check logs
pm2 logs chat-app

# Common issues:
# 1. Port already in use: Change PORT in .env
# 2. MongoDB not running: Start mongod
# 3. Missing .env file: Copy from .env.example
```

### Can't connect to MongoDB
```bash
# Test connection
mongosh "mongodb://localhost:27017/chatapp"

# Check if running
sudo systemctl status mongod

# Start if stopped
sudo systemctl start mongod
```

### CORS errors in browser
```bash
# Add your domain to ALLOWED_ORIGINS in .env.local
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart server
pm2 restart chat-app
```

### Rate limit errors
```bash
# Temporarily increase limits in server.js
const messageRateLimiter = new RateLimiter(60, 60000); // 60 per minute
const joinRateLimiter = new RateLimiter(20, 60000);    // 20 per minute

# Restart
pm2 restart chat-app
```

---

## 🔥 One-Command Deploy (Docker)

**Create `docker-compose.yml`**:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/chatapp
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    depends_on:
      - mongo
  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
```

**Deploy**:
```bash
# Set environment variables
export ADMIN_PASSWORD="your_strong_password"
export ALLOWED_ORIGINS="https://yourdomain.com"

# Deploy
docker-compose up -d

# View logs
docker-compose logs -f app
```

---

## 📈 Performance Tuning

### For High Traffic (1000+ users)

**1. Enable PM2 Cluster Mode**:
```bash
pm2 start server.js --name chat-app -i max
```

**2. Increase MongoDB Connection Pool**:
```javascript
// In src/lib/mongodb.js
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
});
```

**3. Add Redis for Horizontal Scaling**:
```bash
npm install @socket.io/redis-adapter redis
```

See [PRODUCTION.md](PRODUCTION.md) for detailed instructions.

---

## 🎯 Testing After Deployment

```bash
# 1. Health Check
curl https://yourdomain.com/api/health

# 2. Load Test
npm install -g artillery
artillery quick --count 100 --num 10 https://yourdomain.com

# 3. Security Check
npm audit
curl -I https://yourdomain.com  # Check headers

# 4. SSL Test
# Visit: https://www.ssllabs.com/ssltest/
```

---

## 📞 Support Resources

- **Full Guide**: [PRODUCTION.md](PRODUCTION.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Features**: [README.md](README.md)
- **Summary**: [PRODUCTION_READY.md](PRODUCTION_READY.md)

---

## ✨ You're Ready!

Your production-ready chat application with:
- ✅ Security features enabled
- ✅ Rate limiting configured
- ✅ Health monitoring active
- ✅ Graceful shutdown handling
- ✅ Error logging
- ✅ Performance optimizations

**Now deploy and scale!** 🚀
