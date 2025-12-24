# Railway Backend Deployment Guide

Step-by-step guide to deploy Spring Boot backend on Railway.

## Prerequisites

- GitHub account with your project pushed
- Railway account (sign up at https://railway.app)

## Step 1: Sign Up / Login to Railway

1. Go to https://railway.app
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with GitHub (recommended) or email

## Step 2: Create New Project

1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub if prompted
4. Select your repository: `dakshatrawat/bsr-booking`
5. Click **"Deploy Now"**

## Step 3: Add MySQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will create a MySQL database
4. Wait for it to provision (takes 1-2 minutes)

## Step 4: Configure Your Service

1. Click on your **service** (the one that says "bsr-booking" or similar)
2. Go to **"Settings"** tab
3. Set **Root Directory**: `spring-backend`
4. Set **Build Command**: `./mvnw clean package -DskipTests`
5. Set **Start Command**: `java -jar target/*.jar`

## Step 5: Add Environment Variables

Go to your service → **"Variables"** tab → Add these variables:

### Database Variables (from Railway MySQL)
1. Click on your **MySQL database** service
2. Go to **"Variables"** tab
3. Copy the connection details:
   - `MYSQLHOST` (hostname)
   - `MYSQLPORT` (port, usually 3306)
   - `MYSQLDATABASE` (database name)
   - `MYSQLUSER` (username)
   - `MYSQLPASSWORD` (password)
   - `MYSQL_URL` (full connection URL)

4. Go back to your **Spring Boot service** → **"Variables"** tab
5. Add these variables:

```
SPRING_DATASOURCE_URL=${MYSQL_URL}
SPRING_DATASOURCE_USERNAME=${MYSQLUSER}
SPRING_DATASOURCE_PASSWORD=${MYSQLPASSWORD}
SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.MySQL8Dialect
```

### Application Variables

**Note:** Railway automatically sets `PORT` environment variable. Don't set `SERVER_PORT` - use `PORT` instead.

```
SPRING_APPLICATION_NAME=bsr-booking
SECRETE_JWT_STRING=8c7e3f9b4a5d2f6c9e1a8b7d6f0c2a1e4b9d8f7a6c5e4d3b2a1f9e8
```

**Important:** Railway sets `PORT` automatically. Your `application.properties` should use:
```properties
server.port=${PORT:9090}
```

### Email Configuration

```
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=dakshatrawat77@gmail.com
SPRING_MAIL_PASSWORD=oczb ynxp mrmw xrbc
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_REQUIRED=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_CONNECTIONTIMEOUT=10000
SPRING_MAIL_PROPERTIES_MAIL_SMTP_TIMEOUT=10000
SPRING_MAIL_PROPERTIES_MAIL_SMTP_WRITETIMEOUT=10000
```

### Razorpay Configuration

```
RAZORPAY_KEY_ID=rzp_test_Rv2hCde67jeidW
RAZORPAY_KEY_SECRET=7s23GOiF6ax4P9esrna8eqet
```

### File Upload

```
SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE=2GB
SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE=2GB
```

## Step 6: Update application.properties (Optional but Recommended)

For better security, update `application.properties` to use environment variables:

```properties
spring.application.name=${SPRING_APPLICATION_NAME:bsr-booking}
server.port=${PORT:9090}

# MySQL Connection (from Railway)
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
spring.datasource.driver-class-name=${SPRING_DATASOURCE_DRIVER_CLASS_NAME:com.mysql.cj.jdbc.Driver}
spring.jpa.properties.hibernate.dialect=${SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT:org.hibernate.dialect.MySQL8Dialect}
spring.jpa.hibernate.ddl-auto=${SPRING_JPA_HIBERNATE_DDL_AUTO:update}

secreteJwtString=${SECRETE_JWT_STRING}

# Mail configuration
spring.mail.host=${SPRING_MAIL_HOST:smtp.gmail.com}
spring.mail.port=${SPRING_MAIL_PORT:587}
spring.mail.username=${SPRING_MAIL_USERNAME}
spring.mail.password=${SPRING_MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=${SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH:true}
spring.mail.properties.mail.smtp.starttls.enable=${SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE:true}
spring.mail.properties.mail.smtp.starttls.required=${SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_REQUIRED:true}

# Razorpay
razorpay.key.id=${RAZORPAY_KEY_ID}
razorpay.key.secret=${RAZORPAY_KEY_SECRET}

# File upload
spring.servlet.multipart.max-file-size=${SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE:2GB}
spring.servlet.multipart.max-request-size=${SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE:2GB}
```

## Step 7: Deploy

1. Railway will automatically detect changes and deploy
2. Or click **"Deploy"** button in your service
3. Watch the build logs in the **"Deployments"** tab
4. Wait for deployment to complete (5-10 minutes first time)

## Step 8: Get Your Backend URL

1. Go to your service → **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** (or use the auto-generated one)
4. Copy the URL (e.g., `https://bsr-booking-production.up.railway.app`)
5. Your API base URL will be: `https://your-domain.railway.app/api`

## Step 9: Update CORS (Important!)

Make sure your `CorsConfig.java` allows your Vercel frontend domain:

```java
allowedOrigins("https://your-vercel-app.vercel.app", "https://your-vercel-app.vercel.app")
```

## Step 10: Test Your Backend

1. Open your Railway domain in browser
2. Test endpoint: `https://your-domain.railway.app/api/auth/test` (if you have one)
3. Check logs in Railway dashboard for any errors

## Troubleshooting

### Build Fails
- Check build logs in Railway
- Verify Java version (Railway uses Java 21 by default)
- Make sure `pom.xml` is correct

### Database Connection Error
- Verify MySQL service is running
- Check environment variables are set correctly
- Verify `MYSQL_URL` format is correct

### Application Won't Start
- Check logs in Railway dashboard
- Verify all environment variables are set
- Check port configuration (Railway sets `PORT` env var automatically)

### CORS Errors
- Update `CorsConfig.java` with your Vercel domain
- Redeploy backend

## Next Steps

1. Copy your Railway backend URL
2. Use it as `API_URL` in Vercel frontend deployment
3. Update CORS settings in backend
4. Test the full application

## Railway Free Tier Limits

- 500 hours/month free compute
- $5 credit monthly
- MySQL database included
- Auto-scaling
- Custom domains available

