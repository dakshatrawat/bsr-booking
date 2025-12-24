# Railway Quick Fix Guide

## Most Common Issue: Wrong Settings

### ✅ Correct Railway Settings:

1. **Service Settings** (Go to your service → Settings tab):
   - **Root Directory**: `spring-backend` ⚠️ (NOT empty, NOT `spring-backend/src`)
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/*.jar`

2. **Environment Variables** (Go to Variables tab):
   - Add database variables from MySQL service
   - Add all other required variables (see RAILWAY_DEPLOYMENT.md)

## What Error Are You Seeing?

### If you see: "Cannot find pom.xml"
**Fix:** Set Root Directory to `spring-backend`

### If you see: "Build failed"
**Fix:** Check build logs, verify Maven wrapper exists

### If you see: "Port already in use"
**Fix:** Use `server.port=${PORT:9090}` in application.properties (Railway sets PORT automatically)

### If you see: "Database connection failed"
**Fix:** Add database environment variables from MySQL service

## Quick Steps to Fix:

1. **Check Root Directory:**
   - Service → Settings → Root Directory
   - Must be: `spring-backend`

2. **Check Build Command:**
   - Service → Settings → Build Command
   - Must be: `./mvnw clean package -DskipTests`

3. **Check Start Command:**
   - Service → Settings → Start Command
   - Must be: `java -jar target/*.jar`

4. **Add Environment Variables:**
   - Service → Variables tab
   - Add all variables (see RAILWAY_DEPLOYMENT.md)

5. **Redeploy:**
   - Click "Redeploy" button

## Share the Error

Please share:
1. The exact error message from Railway build logs
2. What step failed (Build? Start? Runtime?)
3. Screenshot of your Service Settings

This will help me give you a specific fix!

