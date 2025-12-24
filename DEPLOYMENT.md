# Deployment Guide

## Frontend Deployment on Vercel

### Step 1: Prepare Environment Variables

1. Deploy your Spring Boot backend first (see Backend Deployment section)
2. Note your backend URL (e.g., `https://your-backend.railway.app`)

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Navigate to frontend folder:
```bash
cd angular-frontend
```

3. Login to Vercel:
```bash
vercel login
```

4. Deploy with environment variable:
```bash
vercel --env API_URL=https://your-backend-url.com/api
```

Or set it in Vercel dashboard after deployment.

#### Option B: Using Vercel Dashboard (Recommended)

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. **IMPORTANT - Configure project:**
   - **Root Directory**: Click "Edit" → Set to `angular-frontend`
   - **Framework Preset**: Leave as "Other" or "Angular" (doesn't matter, we override)
   - **Build Command**: `npm run build:prod`
   - **Output Directory**: `dist/hotel-angular/browser`
   - **Install Command**: `npm install` (default)
5. **Add Environment Variable** (CRITICAL - Do this BEFORE deploying):
   - Click "Environment Variables" section
   - Click "Add New"
   - Add variable:
     - **Name**: `API_URL`
     - **Value**: `https://your-backend-url.com/api` (replace with your actual backend URL)
     - **Environment**: Select all (Production, Preview, Development)
   - Click "Save"
6. Click "Deploy"

**Note**: If you see build errors, make sure:
- Root Directory is set to `angular-frontend` (not root)
- Environment variable `API_URL` is set correctly
- Your backend is deployed and accessible

### Step 3: Verify Deployment

1. After deployment, check your Vercel URL
2. Open browser console and verify API calls go to correct backend URL
3. If API_URL is wrong, update it in Vercel dashboard → Settings → Environment Variables → Redeploy

## Backend Deployment Options

Vercel doesn't support Java/Spring Boot. Use one of these:

### Option 1: Railway (Recommended - Easy)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Set Root Directory to `spring-backend`
6. Add environment variables:
   - Database connection details
   - Razorpay keys
   - Email settings
7. Railway auto-detects Spring Boot and deploys

### Option 2: Render

1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Set:
   - Build Command: `./mvnw clean package`
   - Start Command: `java -jar target/*.jar`
   - Root Directory: `spring-backend`
5. Add environment variables
6. Deploy

### Option 3: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set buildpack: `heroku buildpacks:set heroku/java`
5. Deploy: `git push heroku main`
6. Set config vars in Heroku dashboard

### Option 4: AWS/DigitalOcean

- Requires more setup
- Good for production with high traffic
- Need to set up EC2/VM, database, etc.

## Important Notes

1. **CORS Configuration**: Update `CorsConfig.java` to allow your Vercel frontend URL
2. **Database**: Use cloud database (Railway Postgres, AWS RDS, etc.)
3. **Environment Variables**: Never commit sensitive data
4. **API URL**: Update frontend environment variable after backend deployment

## Testing Deployment

1. Frontend: Visit your Vercel URL
2. Backend: Test API endpoints
3. Check browser console for CORS errors
4. Verify authentication flow works

## Troubleshooting

- **CORS errors**: Update backend CORS config
- **API not found**: Check environment variable `API_URL`
- **Build fails**: Check Node.js version (use 18+)
- **Backend not responding**: Check backend logs and database connection

