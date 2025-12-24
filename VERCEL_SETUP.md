# Vercel Deployment Setup

## Quick Fix for Build Errors

If you're getting build errors on Vercel, follow these steps:

### Step 1: Configure Root Directory

1. Go to your Vercel project dashboard
2. Go to **Settings** → **General**
3. Scroll to **Root Directory**
4. Click **Edit** and set it to: `angular-frontend`
5. Click **Save**

### Step 2: Set Environment Variable

1. Go to **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `API_URL`
   - **Value**: `https://your-backend-url.com/api` (your actual backend URL)
   - **Environment**: Select all (Production, Preview, Development)
3. Click **Save**

### Step 3: Update Build Settings

1. Go to **Settings** → **General**
2. Scroll to **Build & Development Settings**
3. Verify:
   - **Build Command**: `npm run build:prod`
   - **Output Directory**: `dist/hotel-angular/browser`
   - **Install Command**: `npm install`

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click the **3 dots** on latest deployment
3. Click **Redeploy**

## Common Build Errors

### Error: "Cannot find module"
- **Fix**: Make sure Root Directory is set to `angular-frontend`

### Error: "API_URL is not defined"
- **Fix**: Add `API_URL` environment variable in Vercel dashboard

### Error: "Build command failed"
- **Fix**: Check that `replace-env.js` exists in `angular-frontend` folder
- **Fix**: Verify `package.json` has `build:prod` script

### Error: "Output directory not found"
- **Fix**: Verify Output Directory is `dist/hotel-angular/browser`
- **Fix**: Check Angular build actually creates this path

## Verify Build Locally

Test the build command locally:

```bash
cd angular-frontend
npm install
export API_URL=https://your-backend-url.com/api
npm run build:prod
```

Check if `dist/hotel-angular/browser` folder is created.

## Still Having Issues?

1. Check Vercel build logs for specific error messages
2. Verify all files are committed to GitHub
3. Make sure `angular-frontend/vercel.json` exists
4. Ensure `angular-frontend/replace-env.js` exists

