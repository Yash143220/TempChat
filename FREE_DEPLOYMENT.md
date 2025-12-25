# 🆓 Free Full-Stack Deployment Guide

Deploy your ephemeral chat app **100% FREE** using Render + MongoDB Atlas.

**⚡ Free Tier Details:**
- **750 hours/month compute** = Enough to run 24/7 for entire month (31 days × 24 hours = 744 hours)
- **Sleeps after 15 min inactivity** = App hibernates when idle, wakes up in 30-60 sec on next request
- **MongoDB: 512MB storage** = Thousands of messages (plenty for chat app)

**✅ Your app CAN run continuously 24/7 within free limits!**
The "sleep" feature saves compute hours when nobody is using it, but you still get enough hours to run all month.

---

## 🚀 Step-by-Step Deployment (15 minutes)

### Step 1: Setup MongoDB Atlas (Free Database)

1. **Create Account**: Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)

2. **Create Cluster**:
   - Click "Build a Database"
   - Select **M0 FREE** tier
   - Choose region closest to you
   - Cluster Name: `ChatCluster` (or anything)
   - Click "Create"

3. **Setup Database Access**:
   - Go to "Database Access" (left menu)
   - Click "Add New Database User"
   - Username: `chatadmin` (remember this)
   - Password: Click "Autogenerate Secure Password" → **COPY IT!**
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Setup Network Access**:
   - Go to "Network Access" (left menu)
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm

5. **Get Connection String**:
   - Go to "Database" → Click "Connect" on your cluster
   - Select "Connect your application"
   - Driver: Node.js, Version: 5.5 or later
   - Copy connection string (looks like):
     ```
     mongodb+srv://chatadmin:<password>@chatcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the password you copied earlier
   - **Save this connection string!**

---

### Step 2: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Create .gitignore (should already exist)
# Make sure it includes:
# node_modules/
# .env*.local
# .next/

# Add all files
git add .

# Commit
git commit -m "Ready for deployment"

# Create GitHub repo
# Go to github.com → New repository
# Name: ephemeral-chat (or anything)
# Public or Private: Your choice
# Don't initialize with README (you already have one)

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

### Step 3: Deploy Backend to Render

1. **Create Account**: Go to [render.com](https://render.com/register)

2. **Connect GitHub**:
   - Click "New +" → "Web Service"
   - Connect GitHub account
   - Select your repository

3. **Configure Backend Service**:
   - **Name**: `chat-backend` (or anything)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV = production
   
   MONGODB_URI = mongodb+srv://chatadmin:YOUR_PASSWORD@chatcluster.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
   
   ADMIN_PASSWORD = your-secure-password-here
   
   ALLOWED_ORIGINS = https://YOUR_FRONTEND_NAME.onrender.com
   ```
   
   **Important**: 
   - Replace MongoDB connection string with yours
   - For `ALLOWED_ORIGINS`, you'll update this after frontend is deployed
   - Change `ADMIN_PASSWORD` to something secure

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 2-3 minutes for build
   - **Copy your backend URL**: `https://chat-backend.onrender.com`

---

### Step 4: Deploy Frontend to Render

1. **Create Another Web Service**:
   - Click "New +" → "Web Service"
   - Select **same repository** (it will be a separate service)

2. **Configure Frontend Service**:
   - **Name**: `chat-frontend` (or anything)
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

3. **Add Environment Variables**:
   ```
   NODE_ENV = production
   
   NEXT_PUBLIC_SOCKET_URL = https://YOUR_BACKEND_NAME.onrender.com
   ```
   
   **Replace** `YOUR_BACKEND_NAME` with your actual backend service name from Step 3

4. **Deploy**:
   - Click "Create Web Service"
   - Wait 3-5 minutes for build
   - **Your app is live!** 🎉

---

### Step 5: Update Backend CORS

Now that frontend is deployed, update backend's `ALLOWED_ORIGINS`:

1. Go to your **backend service** in Render dashboard
2. Click "Environment" (left menu)
3. Find `ALLOWED_ORIGINS` variable
4. Update value to: `https://YOUR_FRONTEND_NAME.onrender.com`
5. Click "Save Changes"
6. Backend will automatically redeploy (1-2 minutes)

---

### Step 6: Test Your Deployment

1. **Visit your frontend URL**: `https://YOUR_FRONTEND_NAME.onrender.com`
2. **Create a room** and test messaging
3. **Test admin room**: Go to `/room/admin` and use your admin password
4. **Test file uploads**: Try sending images and PDFs
5. **Open in multiple browsers** to test real-time sync

**⚠️ First load will be slow** (30-60 seconds) because free tier sleeps after 15 min inactivity.

---

## 🤖 Auto-Deploy with GitHub Actions

Every time you push to GitHub, automatically deploy to Render.

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy (Backend)
        run: curl -X POST ${{ secrets.RENDER_BACKEND_HOOK }}
      
      - name: Trigger Render Deploy (Frontend)
        run: curl -X POST ${{ secrets.RENDER_FRONTEND_HOOK }}
```

**Setup Deploy Hooks**:

1. **Get Backend Hook**:
   - Go to Render dashboard → Your backend service
   - Settings → "Deploy Hook"
   - Copy URL

2. **Get Frontend Hook**:
   - Go to your frontend service
   - Settings → "Deploy Hook"
   - Copy URL

3. **Add to GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `RENDER_BACKEND_HOOK`, Value: backend hook URL
   - Add another: `RENDER_FRONTEND_HOOK`, Value: frontend hook URL

Now every push to `main` branch will auto-deploy! 🚀

---

## 🔧 Local Development Setup

Keep development environment working:

**Create `.env.local`:**
```env
# Local development
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chatapp
ADMIN_PASSWORD=admin123
ALLOWED_ORIGINS=http://localhost:3000
```

**Or use your MongoDB Atlas for development too:**
```env
NODE_ENV=development
MONGODB_URI=mongodb+srv://chatadmin:YOUR_PASSWORD@chatcluster.xxxxx.mongodb.net/chatapp-dev?retryWrites=true&w=majority
ADMIN_PASSWORD=admin123
ALLOWED_ORIGINS=http://localhost:3000
```

**Run locally:**
```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend
npm run dev
```

---

## 📊 Monitor Your App

### Render Dashboard

- **Logs**: View real-time logs in Render dashboard
- **Metrics**: See memory usage, response times
- **Activity**: Track deploys and restarts

### MongoDB Atlas

- **Database Monitoring**:
  - Go to your cluster → "Metrics"
  - See connections, operations, storage
- **Browse Collections**:
  - Click "Browse Collections"
  - View messages, analytics data

---

## ⚡ Performance Tips

### Understanding Free Tier Limits

**750 hours/month = 31 days × 24 hours = 744 hours**
- You get FULL MONTH of runtime if needed
- "Sleep after 15 min" just hibernates when idle to save hours
- Wakes up automatically on next request (30-60 sec)

### Keep App Warm (Optional)

Use a free ping service to prevent sleep:

**Uptime Robot (Free)**:
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add Monitor:
   - Type: HTTP(s)
   - URL: Your Render frontend URL
   - Interval: 5 minutes
3. This pings every 5 min = ~8,640 pings/month
4. Keeps app awake = uses ~360 hours/month (still within 750 limit)

**Cron-job.org (Free)**:
- Similar to Uptime Robot
- Ping every 5-15 minutes
- Keeps backend warm

### Upgrade to Paid ($7/month per service)

If you need instant response:
- ❌ No cold starts (always warm)
- ⚡ Instant response times
- 💪 More CPU/RAM
- 🌐 Custom domains included

### Optimize Bundle Size

```bash
# Analyze bundle
npm run build

# Remove unused dependencies
npm prune
```

---

## 🆘 Troubleshooting

### "Application failed to respond"
- Backend is sleeping, wait 30-60 seconds
- Check Render logs for errors
- Verify environment variables

### "Socket.IO connection failed"
- Check `NEXT_PUBLIC_SOCKET_URL` in frontend env vars
- Verify `ALLOWED_ORIGINS` in backend includes frontend URL
- Check both services are running in Render dashboard

### "MongoDB connection failed"
- Verify connection string is correct
- Check password has no special characters (or URL encode them)
- Ensure IP whitelist includes 0.0.0.0/0
- Test connection string locally first

### "Admin password not working"
- Check `ADMIN_PASSWORD` environment variable in backend
- It's case-sensitive
- Try redeploying backend after changing

### Frontend builds but shows errors
- Check browser console for errors
- Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
- Ensure backend is deplWhat It Means |
|---------|-----------|---------------|
| **Render (Backend)** | 750 hours/month | 31 days of 24/7 runtime ✅ |
| **Render (Frontend)** | 750 hours/month | 31 days of 24/7 runtime ✅ |
| **MongoDB Atlas** | 512MB storage | ~10,000+ messages |
| **GitHub** | Unlimited repos | Public or private |
| **GitHub Actions** | 2000 min/month | ~33 hours of builds |

**Total Cost**: $0/month 🎉

### Hours Calculation
- **1 month** = 31 days × 24 hours = **744 hours**
- **Your limit** = **750 hours/month**
- **Result**: Run 24/7 all month + 6 hours extra! ✅

**With Ping Service (keeps warm)**:
- Ping every 5 min = uses ~360 hours/month
- Still have 390 hours buffer
- Best of both: No cold starts + free tier ✅red (only your domain)
- [x] No secrets in GitHub repo (use .gitignore)
- [x] Environment variables on Render (not in code)
- [x] Rate limiting enabled (already in server.js)
- [x] Input validation active (already in server.js)

---

## 💰 Cost Breakdown

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| **Render (Backend)** | 750 hours/month | Sleeps after 15 min |
| **Render (Frontend)** | 750 hours/month | Sleeps after 15 min |
| **MongoDB Atlas** | 512MB storage | Enough for thousands of messages |
| **GitHub** | Unlimited repos | Public or private |
| **GitHub Actions** | 2000 min/month | More than enough |

**Total Cost**: $0/month 🎉

---

## 🚀 Next Steps

### Upgrade Options (Optional)

**Render Paid ($7/month per service)**:
- No cold starts
- Better performance
- More CPU/memory
- Custom domains

**MongoDB Atlas Paid (starts $9/month)**:
- More storage
- Backups
- Better performance
- Multi-region

### Add Custom Domain (Free with Cloudflare)

1. Buy domain ($10-15/year)
2. Add to Render:
   - Settings → Custom Domains
   - Add your domain
3. Update DNS records as instructed
4. SSL automatically configured

### Add Analytics (Free)

- **Vercel Analytics**: If you switch to Vercel
- **Google Analytics**: Add tracking code
- **Plausible**: Privacy-friendly analytics

---

## ✅ Deployment Complete!

<function_calls>
<invoke name="grep_search">
<parameter name="query">io\(|socket\.io-client