# Production Deployment Guide

## 🔒 Security Features Implemented

### Input Validation & Sanitization
- ✅ All user inputs are validated and sanitized
- ✅ XSS protection through HTML sanitization
- ✅ Maximum length limits for messages, usernames, and room names
- ✅ Content Security Policy headers
- ✅ File type and size validation

### Rate Limiting
- ✅ **Connection Rate Limit**: 20 connections per minute per IP
- ✅ **Join Rate Limit**: 10 room joins per minute per IP
- ✅ **Message Rate Limit**: 30 messages per minute per user

### CORS & Security Headers
- ✅ Configurable CORS origins (whitelist-based)
- ✅ Strict Transport Security (HSTS)
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-Content-Type-Options: nosniff
- ✅ XSS Protection enabled
- ✅ Referrer Policy configured
- ✅ Permissions Policy for camera/microphone

### File Upload Security
- ✅ Max file size: 10MB
- ✅ Allowed types: JPEG, PNG, GIF, WebP only
- ✅ Socket.IO buffer size limit: 10MB

### Password Security
- ✅ Admin password hashed with bcrypt
- ✅ Password verification for admin room

### Monitoring & Health Checks
- ✅ `/api/health` endpoint for monitoring
- ✅ Graceful shutdown handling
- ✅ Error logging and handling
- ✅ Automatic log cleanup (15-day retention)

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Create a `.env.production` file with the following:

```env
# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# Security
ADMIN_PASSWORD=your_strong_password_here_min_16_chars
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database
MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/chatapp?authSource=admin

# Optional: For horizontal scaling
# REDIS_URL=redis://localhost:6379
```

### 2. MongoDB Setup

```bash
# Create MongoDB user with appropriate permissions
use chatapp
db.createUser({
  user: "chatapp_user",
  pwd: "strong_password",
  roles: [{ role: "readWrite", db: "chatapp" }]
})

# Enable authentication in mongod.conf
security:
  authorization: enabled
```

### 3. Build and Start

```bash
# Install dependencies
npm install --production

# Build Next.js app
npm run build

# Start server
NODE_ENV=production node server.js

# Or use PM2 for process management
pm2 start server.js --name "chat-app" -i max
pm2 save
pm2 startup
```

---

## 🚀 Deployment Options

### Option 1: VPS/Dedicated Server (Recommended)

**Requirements:**
- Node.js 18+ 
- MongoDB 5.0+
- Nginx (reverse proxy)
- SSL Certificate (Let's Encrypt)
- 2GB+ RAM
- 2+ CPU cores

**Nginx Configuration:**

```nginx
upstream chat_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://chat_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Socket.IO support
        proxy_read_timeout 86400;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/m;
    limit_req zone=general burst=50 nodelay;
}
```

### Option 2: Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000

# Start server
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
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
    restart: unless-stopped

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

### Option 3: Platform-as-a-Service (PaaS)

**Heroku / Railway / Render:**

1. Add `Procfile`:
```
web: node server.js
```

2. Configure environment variables in dashboard

3. Add MongoDB addon or connect to MongoDB Atlas

4. Deploy via Git push

---

## 📊 Monitoring & Maintenance

### Health Check Endpoint

```bash
curl https://yourdomain.com/api/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-12-25T...",
  "uptime": 3600,
  "memory": {...},
  "activeRooms": 5,
  "activeUsers": 23
}
```

### PM2 Monitoring

```bash
# View logs
pm2 logs chat-app

# Monitor performance
pm2 monit

# Restart on high memory
pm2 reload chat-app
```

### MongoDB Monitoring

```bash
# Check database size
db.stats()

# Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)

# Index performance
db.collection.getIndexes()
```

---

## 🔧 Performance Optimization

### 1. Enable Compression
Already enabled via `compression` middleware in server.js

### 2. CDN for Static Assets
- Use Cloudflare or similar CDN
- Cache Next.js static files
- Configure in `next.config.js`

### 3. Database Optimization
```javascript
// Add compound indexes for better query performance
db.room_logs.createIndex({ roomSlug: 1, timestamp: -1 })
db.user_activity.createIndex({ userId: 1, timestamp: -1 })
```

### 4. Horizontal Scaling with Redis
```bash
npm install @socket.io/redis-adapter redis
```

```javascript
// In server.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Redis adapter connected');
});
```

---

## 🛡️ Security Best Practices

### 1. Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 2. Regular Updates
```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies
npm audit
npm audit fix

# Update MongoDB
apt upgrade mongodb-org
```

### 3. Backup Strategy
```bash
# MongoDB backup script
mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# Automate with cron
0 2 * * * /path/to/backup-script.sh
```

### 4. SSL/TLS Configuration
```bash
# Let's Encrypt certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

---

## 🚨 Troubleshooting

### High Memory Usage
```bash
# Check Node.js heap
node --max-old-space-size=2048 server.js

# Monitor with PM2
pm2 start server.js --max-memory-restart 500M
```

### Connection Issues
- Check firewall rules
- Verify CORS settings in `.env`
- Check MongoDB connection string
- Review Socket.IO connection logs

### Database Performance
- Add indexes for frequently queried fields
- Enable MongoDB query profiler
- Consider read replicas for high traffic

---

## 📈 Scaling Guide

### Vertical Scaling (Single Server)
- Increase RAM: 2GB → 4GB → 8GB
- Add CPU cores for PM2 cluster mode
- Optimize MongoDB with more RAM

### Horizontal Scaling (Multiple Servers)
1. Setup Redis for Socket.IO adapter
2. Use load balancer (Nginx/HAProxy)
3. MongoDB replica set for redundancy
4. Sticky sessions for WebSocket connections

---

## 📞 Support & Maintenance

### Logs Location
- Application: `/var/log/pm2/` or `pm2 logs`
- Nginx: `/var/log/nginx/`
- MongoDB: `/var/log/mongodb/`

### Important Metrics to Monitor
- Active connections
- Message throughput
- Memory usage
- CPU utilization
- Database query performance
- Error rates

### Recommended Tools
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime**: UptimeRobot, Pingdom
- **APM**: New Relic, Datadog

---

## ✅ Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB authentication enabled
- [ ] Strong admin password set
- [ ] CORS origins whitelisted
- [ ] SSL certificate installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring system setup
- [ ] Health checks configured
- [ ] PM2 or Docker orchestration ready
- [ ] Nginx reverse proxy configured
- [ ] Rate limiting tested
- [ ] Load testing performed
- [ ] Error logging verified
- [ ] Graceful shutdown tested

---

## 🎯 Performance Targets

- **Concurrent Users**: 1,000+ per server
- **Message Latency**: <100ms
- **Uptime**: 99.9%
- **Response Time**: <200ms (API)
- **Database Queries**: <50ms average

