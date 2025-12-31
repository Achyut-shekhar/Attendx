# 🚀 Deployment Guide - Vercel (Frontend) + Render (Backend)

## ✅ Files Already Prepared:

- ✅ `requirements.txt` - Updated with pinned versions including bcrypt==4.1.3
- ✅ `main.py` - CORS configured for production
- ✅ `vercel.json` - Vercel configuration created
- ✅ API base URL uses environment variable: `VITE_API_URL`

---

## 📋 **Step 1: Deploy Backend to Render**

### 1.1 Push to GitHub (if not already done)

```powershell
git add .
git commit -m "Prepare for deployment with Neon database"
git push origin main
```

### 1.2 Create Render Account & Deploy

1. Go to **[render.com](https://render.com)** and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. **Connect your GitHub repository**: `facul-student-hub`

### 1.3 Configure Web Service

| Setting            | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Name**           | `facul-attendance-backend`                     |
| **Region**         | `Oregon (US West)` or closest to you           |
| **Branch**         | `main`                                         |
| **Root Directory** | `attendance_backend`                           |
| **Runtime**        | `Python 3`                                     |
| **Build Command**  | `pip install -r requirements.txt`              |
| **Start Command**  | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type**  | `Free`                                         |

### 1.4 Add Environment Variables (Click "Advanced")

Add these **3 environment variables**:

```
DB_URL
postgresql://neondb_owner:npg_MRIWLEaG3ek1@ep-quiet-meadow-a43qiwpc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

SECRET_KEY
hISWjvtk4MWkpzhQ8bIs5nNl4z9habXEyR3NXmKXnAQ

FRONTEND_URL
https://your-app.vercel.app
```

**⚠️ Note:** You'll update `FRONTEND_URL` after deploying frontend in Step 2

### 1.5 Deploy

- Click **"Create Web Service"**
- Wait 3-5 minutes for deployment
- Copy your backend URL: `https://facul-attendance-backend.onrender.com`

### 1.6 Test Backend

Visit: `https://your-backend-url.onrender.com/docs`

You should see the FastAPI Swagger documentation! ✅

---

## 📋 **Step 2: Deploy Frontend to Vercel**

### 2.1 Install Vercel CLI (if not installed)

```powershell
npm install -g vercel
```

### 2.2 Login to Vercel

```powershell
vercel login
```

### 2.3 Deploy to Vercel

```powershell
# Navigate to project root
cd C:\Users\achyu\OneDrive\Documents\GitHub\facul-student-hub

# Deploy (will prompt for settings)
vercel
```

**When prompted:**

- Set up and deploy? → **Y**
- Which scope? → Select your account
- Link to existing project? → **N**
- Project name? → `facul-student-hub` (or any name)
- In which directory is your code located? → `./` (press Enter)
- Want to override settings? → **N**

### 2.4 Add Environment Variable

After initial deploy, add the backend URL:

```powershell
vercel env add VITE_API_URL
```

When prompted:

- Value: `https://your-backend-url.onrender.com` (from Step 1.5)
- Environment: **Production** (select with spacebar)

### 2.5 Deploy to Production

```powershell
vercel --prod
```

### 2.6 Get Your Frontend URL

After deployment, you'll get a URL like:

```
https://facul-student-hub.vercel.app
```

---

## 📋 **Step 3: Update Backend CORS**

Now that you have your Vercel URL, update Render:

1. Go to **Render Dashboard** → Your service
2. Click **"Environment"** in left sidebar
3. Edit `FRONTEND_URL` variable
4. Set value to: `https://your-app.vercel.app`
5. Click **"Save Changes"**
6. Render will auto-redeploy (takes 1-2 minutes)

---

## 📋 **Step 4: Test Your Deployed App**

1. **Visit your frontend**: `https://your-app.vercel.app`

2. **Test login** with:

   - Email: `achyutshekhar54@gmail.com`
   - Password: `achyut@2024`

3. **Verify features**:
   - ✅ Login/Register
   - ✅ View classes
   - ✅ Attendance marking
   - ✅ Notifications

---

## 🔧 **Troubleshooting**

### Backend Issues

❌ **"Application failed to respond"**

- Check Render logs: Dashboard → Logs tab
- Verify all 3 environment variables are set
- Check if Neon database is active

❌ **Database connection errors**

```
Error: could not connect to server
```

- Verify `DB_URL` in Render environment variables
- Ensure `sslmode=require` is in the connection string
- Check Neon dashboard - database must be active

### Frontend Issues

❌ **CORS errors in browser console**

```
Access to fetch has been blocked by CORS policy
```

- Verify `FRONTEND_URL` is set correctly in Render
- Check that frontend URL matches exactly (no trailing slash)
- Wait for Render to finish redeploying after changing env var

❌ **API connection failed**

```
Failed to fetch
```

- Verify `VITE_API_URL` is set in Vercel
- Check backend is running (visit `/docs` endpoint)
- Ensure backend URL doesn't have trailing slash

### How to View Logs

**Render Logs:**

- Dashboard → Your service → "Logs" tab
- Shows real-time server output

**Vercel Logs:**

```powershell
vercel logs
```

**Browser Console:**

- F12 → Console tab
- Check for API errors

---

## 🔄 **Redeploying After Changes**

### Backend Changes:

```powershell
git add .
git commit -m "Update backend"
git push origin main
```

Render auto-deploys from GitHub!

### Frontend Changes:

```powershell
git add .
git commit -m "Update frontend"
git push origin main
vercel --prod
```

---

## 🎯 **Alternative: Deploy Both from GitHub**

### Vercel GitHub Integration:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Add environment variable: `VITE_API_URL`
5. Deploy!

This way, Vercel auto-deploys on every git push! 🎉

---

## 📝 **Important URLs to Save**

After deployment, save these URLs:

```
Frontend (Vercel): https://______.vercel.app
Backend (Render):  https://______.onrender.com
Backend API Docs:  https://______.onrender.com/docs
Neon Database:     https://console.neon.tech
```

---

## ✅ **Checklist**

- [ ] Backend deployed to Render
- [ ] Environment variables set (DB_URL, SECRET_KEY, FRONTEND_URL)
- [ ] Backend accessible at `/docs`
- [ ] Frontend deployed to Vercel
- [ ] VITE_API_URL set in Vercel
- [ ] CORS updated with Vercel URL
- [ ] Login/Register working
- [ ] Database connections working

---

🎉 **You're all set! Your app is now live!**

Need help? Check the troubleshooting section or ask for assistance.
