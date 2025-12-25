# 🚀 Complete Deployment Guide

## Your App Architecture

Your ephemeral chat has **two servers**:
1. **Next.js Frontend** (port 3000) - handles UI/routing
2. **Socket.IO Backend** (server.js on port 3001) - handles real-time messaging

Both can be deployed together or separately.

---

## ⚡ Option 1: Railway (Recommended - Easiest)

Deploy both frontend and backend to Railway with MongoDB.

### Step 1: Prepare Your Project

1. **Create Railway account**: [railway.app](https://railway.app)
2. **Connect GitHub**: Link your repository
3. **Install Railway CLI** (optional):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

### Step 2: Deploy to Railway

#### Method A: Dashboard (No CLI needed)

1. **Create New Project** in Railway dashboard
2. **Add MongoDB**:
   - Click "New" → "Database" → "Add MongoDB"
   - Railway auto-generates `MONGODB_URI`

3. **Deploy Backend (server.js)**:
   - Click "New" → "GitHub Repo" → Select your repo
   - Railway auto-detects Node.js
   - Add environment variables:
     ```
     NODE_ENV=production
     PORT=${{PORT}}
     MONGODB_URI=${{MongoDB.MONGO_URL}}
     ADMIN_PASSWORD=your-secure-password-here
     ALLOWED_ORIGINS=https://your-app-name.up.railway.app
     ```
   - Under Settings → Deploy:
     - Start Command: `node server.js`
     - Root Directory: `/` (or leave empty)

4. **Deploy Frontend (Next.js)**:
   - Click "New" → Same repo (creates separate service)
   - Add environment variables:
     ```
     NODE_ENV=production
     NEXT_PUBLIC_SOCKET_URL=https://your-backend-service.up.railway.app
     ```
   - Under Settings → Deploy:
     - Build Command: `npm run build`
     - Start Command: `npm start`
   - Railway auto-assigns domain like: `your-app.up.railway.app`

#### Method B: Railway CLI

```bash
# Link your project
railway link

# Add MongoDB
railway add mongodb

# Deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set ADMIN_PASSWORD=your-password
```

### Step 3: Connect Frontend to Backend

Update your Next.js app to use Railway backend URL:

**Create/Update `next.config.js`:**
```javascript
module.exports = {
  env: {
    SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  },
}
```

**Update Socket.IO client connection in your room page:**
```typescript
// In src/app/room/[slug]/page.tsx or wherever you initialize socket
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
```

### Step 4: Configure CORS

Update `ALLOWED_ORIGINS` in server.js environment variables to include your Railway frontend URL:
```
ALLOWED_ORIGINS=https://your-frontend.up.railway.app,https://your-custom-domain.com
```

**Railway Costs**: 
- Free tier: $5 credit/month
- Paid: ~$5-10/month for small apps

---

## 🔷 Option 2: Render (Free Tier Available)

Deploy full-stack with free tier (with limitations).

### Backend (Web Service)

1. **Create account**: [render.com](https://render.com)
2. **New Web Service**:
   - Connect GitHub repo
   - Name: `chat-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Add environment variables:
     ```
     NODE_ENV=production
     MONGODB_URI=mongodb+srv://...
     ADMIN_PASSWORD=your-password
     ALLOWED_ORIGINS=https://your-frontend.onrender.com
     ```

3. **Free MongoDB**:
   - Use MongoDB Atlas (free tier)
   - Or upgrade Render for managed MongoDB

### Frontend (Static Site or Web Service)

**Option A: Static Site** (if you build static):
- Build Command: `npm run build && npm run export`
- Publish Directory: `out`

**Option B: Web Service** (SSR):
- Build Command: `npm run build`
- Start Command: `npm start`
- Add env var: `NEXT_PUBLIC_SOCKET_URL=https://chat-backend.onrender.com`

**Render Free Tier**:
- ✅ Free SSL
- ✅ Auto-deploy from GitHub
- ⚠️ Spins down after 15 min inactivity (cold starts)
- ⚠️ 750 hours/month free

---

## 🌊 Option 3: DigitalOcean App Platform

Full-featured with predictable pricing.

### Setup

1. **Create account**: [digitalocean.com](https://digitalocean.com)
2. **Create App**:
   - Connect GitHub
   - DigitalOcean auto-detects components

3. **Configure Components**:
   
   **Backend Component**:
   - Type: Web Service
   - Source Directory: `/`
   - Build Command: `npm install`
   - Run Command: `node server.js`
   - HTTP Port: `8080` (DigitalOcean default)
   - Environment:
     ```
     NODE_ENV=production
     MONGODB_URI=${db.DATABASE_URL}
     ADMIN_PASSWORD=your-password
     PORT=8080
     ```

   **Frontend Component**:
   - Type: Web Service
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - Environment:
     ```
     NEXT_PUBLIC_SOCKET_URL=${backend.PUBLIC_URL}
     ```

4. **Add MongoDB**:
   - Click "Add Resource" → "Database" → "MongoDB"
   - DigitalOcean provisions managed MongoDB
   - Auto-injects `DATABASE_URL` variable

**DigitalOcean Costs**:
- Basic: $5/month per component
- Database: $15/month
- Total: ~$25-30/month

---

## 🐳 Option 4: VPS with Docker (Full Control)

Deploy on any VPS (AWS EC2, DigitalOcean Droplet, Linode).

### Prerequisites
- VPS with Ubuntu 22.04
- Domain name pointed to VPS IP
- SSH access

### Step 1: Create Dockerfile

**Create `Dockerfile` in project root:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

# Expose ports
EXPOSE 3000 3001

# Start both servers
CMD ["sh", "-c", "node server.js & npm start"]
```

**Create `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/chatapp
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - ALLOWED_ORIGINS=https://yourdomain.com
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  mongo_data:
```

### Step 2: Deploy to VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Clone your repo
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Create .env file
nano .env
# Add your environment variables

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 3: Setup Nginx (Reverse Proxy)

**Create `nginx.conf`:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server app:3000;
    }

    upstream backend {
        server app:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Socket.IO backend
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### Step 4: Setup SSL (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (Certbot adds cron job automatically)
certbot renew --dry-run
```

**VPS Costs**:
- DigitalOcean: $6/month (1GB RAM)
- AWS Lightsail: $3.50-5/month
- Linode: $5/month

---

## 🤖 GitHub Actions CI/CD

Automate deployment on every push to main branch.

### For Railway

**Create `.github/workflows/deploy-railway.yml`:**
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Setup**:
1. Get Railway token: `railway login` then `railway whoami --token`
2. Add to GitHub Secrets: Settings → Secrets → New secret
3. Name: `RAILWAY_TOKEN`, Value: your token

### For Render

**Create `.github/workflows/deploy-render.yml`:**
```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

**Setup**:
1. Go to Render Dashboard → Service → Settings
2. Copy "Deploy Hook URL"
3. Add to GitHub Secrets as `RENDER_DEPLOY_HOOK`

### For VPS (Docker)

**Create `.github/workflows/deploy-vps.yml`:**
```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /path/to/your/app
            git pull origin main
            docker-compose down
            docker-compose up -d --build
            docker-compose logs -f
```

**Setup**:
1. Generate SSH key on your local machine: `ssh-keygen -t rsa`
2. Copy public key to VPS: `ssh-copy-id user@vps-ip`
3. Add to GitHub Secrets:
   - `VPS_HOST`: Your VPS IP
   - `VPS_USERNAME`: SSH username
   - `VPS_SSH_KEY`: Private key content

---

## 📦 Environment Variables Setup

### Development (.env.local)
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chatapp
ADMIN_PASSWORD=admin123
ALLOWED_ORIGINS=http://localhost:3000
```

### Production (.env.production or platform environment variables)
```env
NODE_ENV=production
PORT=${PORT}  # Platform assigns this
MONGODB_URI=${DATABASE_URL}  # From managed database
ADMIN_PASSWORD=very-secure-password-change-this
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🔍 VSCode GitHub Integration

### Connect VSCode to GitHub

1. **Install GitHub Extension**:
   - Already included in VS Code
   - Or install "GitHub Pull Requests and Issues"

2. **Sign in to GitHub**:
   - Click account icon (bottom left)
   - Select "Sign in with GitHub"
   - Authorize VS Code

3. **Clone or Init Repository**:
   ```bash
   # Initialize git (if not already)
   git init
   
   # Add remote
   git remote add origin https://github.com/yourusername/your-repo.git
   
   # First push
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

4. **Use Source Control Panel**:
   - Click Source Control icon (left sidebar)
   - Stage changes (+ icon)
   - Commit message
   - Push to GitHub

### GitHub Actions in VSCode

1. **View Workflows**:
   - Install "GitHub Actions" extension
   - View workflows in sidebar
   - See run status and logs

2. **Monitor Deployments**:
   - Push changes to main branch
   - GitHub Actions triggers automatically
   - View build logs in VSCode or GitHub

---

## 🚦 Post-Deployment Checklist

- [ ] Frontend accessible at production URL
- [ ] Backend Socket.IO connecting from frontend
- [ ] MongoDB connection successful
- [ ] Admin room accessible with password
- [ ] File uploads working (images, PDFs)
- [ ] Rate limiting active
- [ ] CORS configured for production domain
- [ ] SSL/HTTPS enabled
- [ ] Environment variables secured
- [ ] GitHub Actions deploying successfully
- [ ] Error monitoring setup (optional)

---

## 📊 Comparison Table

| Platform | Cost | Setup Difficulty | Auto-scaling | MongoDB Included | GitHub Actions |
|----------|------|------------------|--------------|------------------|----------------|
| **Railway** | $5-10/mo | ⭐ Easy | ✅ Yes | ✅ Yes | ✅ Yes |
| **Render** | Free-$7/mo | ⭐⭐ Moderate | ⚠️ Paid | ❌ Atlas | ✅ Yes |
| **DigitalOcean** | $25-30/mo | ⭐⭐ Moderate | ✅ Yes | ✅ Yes | ✅ Yes |
| **VPS+Docker** | $5-10/mo | ⭐⭐⭐ Hard | ❌ Manual | ❌ Self-host | ✅ Yes |

---

## 🆘 Troubleshooting

### Socket.IO Not Connecting
```javascript
// Check CORS in server.js
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true
  }
});
```

### MongoDB Connection Failed
- Check connection string format
- Verify IP whitelist (MongoDB Atlas)
- Test connection locally first

### GitHub Actions Failing
- Check secrets are configured
- Verify environment variables
- Review action logs in GitHub

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <process_id> /F
```

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Docs](https://docs.docker.com)
- [Let's Encrypt](https://letsencrypt.org)

---

## 🎯 Recommended Path

**For Beginners**: Start with **Railway**
- Easiest setup
- Everything in one place
- Good free tier
- Auto-scaling

**For Free Tier**: Use **Render**
- Free hosting (with cold starts)
- Use MongoDB Atlas free tier
- Good for testing/portfolio

**For Production**: Use **DigitalOcean** or **VPS**
- Better performance
- More control
- Predictable costs
- No cold starts

**Quick Start Command** (Railway):
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Your app will be live in 2-3 minutes! 🚀
