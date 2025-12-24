# Railway Deployment Troubleshooting

Common issues and fixes for Railway Spring Boot deployment.

## Quick Checklist

Before checking errors, verify these settings in Railway:

1. **Root Directory**: `spring-backend` (not root, not `spring-backend/src`)
2. **Build Command**: `./mvnw clean package -DskipTests`
3. **Start Command**: `java -jar target/*.jar`
4. **Java Version**: Railway auto-detects Java 21 (from pom.xml)

## Common Errors & Fixes

### Error 1: "Cannot find pom.xml" or "Maven not found"

**Fix:**
- Verify **Root Directory** is set to `spring-backend`
- Go to Service → Settings → Root Directory
- Make sure it says: `spring-backend` (not empty, not `spring-backend/src`)

### Error 2: "Build failed" or "Maven build error"

**Fix:**
- Check build logs in Railway dashboard
- Verify Maven wrapper exists: `spring-backend/mvnw` and `spring-backend/mvnw.cmd`
- Try build command: `chmod +x ./mvnw && ./mvnw clean package -DskipTests`

### Error 3: "Application failed to start" or "Port already in use"

**Fix:**
- Railway sets `PORT` environment variable automatically
- Update `application.properties`:
  ```properties
  server.port=${PORT:9090}
  ```
- Don't set `SERVER_PORT` - use `PORT` instead

### Error 4: "Database connection failed"

**Fix:**
1. Make sure MySQL service is running in Railway
2. Go to MySQL service → Variables tab
3. Copy these variables to your Spring Boot service:
   - `MYSQL_URL` → Set as `SPRING_DATASOURCE_URL`
   - `MYSQLUSER` → Set as `SPRING_DATASOURCE_USERNAME`
   - `MYSQLPASSWORD` → Set as `SPRING_DATASOURCE_PASSWORD`
4. Verify format: `SPRING_DATASOURCE_URL=${MYSQL_URL}` (with the `${}` syntax)

### Error 5: "JAR file not found" or "target/*.jar not found"

**Fix:**
- Check if build completed successfully
- Verify build command created JAR in `target/` folder
- Try start command: `java -jar target/HotelBooking-0.0.1-SNAPSHOT.jar` (exact filename)
- Or use: `java -jar target/*.jar`

### Error 6: "ClassNotFoundException" or "Main class not found"

**Fix:**
- Verify main class exists: `com.bsr.bsr_booking.BsrBookingApplication`
- Check `pom.xml` has correct package name
- Rebuild: `./mvnw clean package -DskipTests`

### Error 7: "Environment variable not found"

**Fix:**
- Go to Service → Variables tab
- Add all required environment variables (see RAILWAY_DEPLOYMENT.md)
- Make sure variable names match exactly (case-sensitive)

## Step-by-Step Fix

### Step 1: Check Service Settings

1. Go to Railway dashboard
2. Click on your service
3. Go to **Settings** tab
4. Verify:
   - **Root Directory**: `spring-backend`
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/*.jar`

### Step 2: Check Build Logs

1. Go to **Deployments** tab
2. Click on the failed deployment
3. Check the **Build Logs** section
4. Look for specific error messages

### Step 3: Verify Files Exist

Make sure these files exist in your repo:
- `spring-backend/pom.xml`
- `spring-backend/mvnw` (Maven wrapper)
- `spring-backend/mvnw.cmd` (Windows wrapper)
- `spring-backend/src/main/java/com/bsr/bsr_booking/BsrBookingApplication.java`

### Step 4: Add Environment Variables

Go to Service → **Variables** tab and add:

**Required:**
- Database connection (from MySQL service)
- JWT secret
- Email config
- Razorpay keys

### Step 5: Update application.properties

Make sure `application.properties` uses environment variables:

```properties
server.port=${PORT:9090}
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
```

## Still Not Working?

1. **Share the exact error message** from Railway build logs
2. **Check these:**
   - Root directory setting
   - Build command
   - Environment variables
   - Build logs for specific errors

3. **Try manual build locally:**
   ```bash
   cd spring-backend
   ./mvnw clean package -DskipTests
   java -jar target/*.jar
   ```
   If this works locally, the issue is Railway configuration.

## Quick Test Commands

Test if your setup is correct:

1. **Check Maven wrapper:**
   ```bash
   cd spring-backend
   ./mvnw --version
   ```

2. **Test build:**
   ```bash
   cd spring-backend
   ./mvnw clean package -DskipTests
   ```

3. **Check JAR exists:**
   ```bash
   ls -la spring-backend/target/*.jar
   ```

