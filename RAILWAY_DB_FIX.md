# Railway Database Connection Fix

## Issue: "Connection refused" even though MySQL is running

This happens when services aren't properly linked or connection URL is wrong.

## Solution 1: Use Railway's Service References (Recommended)

In Railway, when services are in the same project, you can reference variables from other services.

1. **Go to MySQL Service → Variables tab**
2. **Look for `MYSQL_URL` variable** - Railway should provide this
3. **If `MYSQL_URL` exists, use it directly:**
   ```
   SPRING_DATASOURCE_URL=${MYSQL_URL}
   ```
   (Railway automatically injects the value)

## Solution 2: Build Connection URL Manually

If `MYSQL_URL` doesn't exist, you need to reference individual MySQL variables:

1. **Go to MySQL Service → Variables tab**
2. **Note these variables:**
   - `MYSQLHOST` (e.g., `mysql.railway.internal` or a different hostname)
   - `MYSQLPORT` (usually `3306`)
   - `MYSQLDATABASE` (e.g., `railway`)
   - `MYSQLUSER` (e.g., `root`)
   - `MYSQLPASSWORD` (the password)

3. **In Spring Boot Service → Variables, use:**
   ```
   SPRING_DATASOURCE_URL=jdbc:mysql://${MYSQLHOST}:${MYSQLPORT}/${MYSQLDATABASE}
   SPRING_DATASOURCE_USERNAME=${MYSQLUSER}
   SPRING_DATASOURCE_PASSWORD=${MYSQLPASSWORD}
   ```

## Solution 3: Check Service Linking

1. **Verify both services are in the same Railway project**
2. **Check if MySQL service shows "Private Networking" enabled**
3. **Railway services in the same project should automatically have internal networking**

## Solution 4: Alternative Connection URL Format

Try using the public hostname if internal networking isn't working. Check MySQL service for public connection details.

## Quick Debug Steps

1. Check MySQL service → Variables tab → What variables are listed?
2. Check Spring Boot service → Variables tab → Are the variables saved correctly?
3. Check if there's a "Connect" or "Networking" section in MySQL service that shows connection details

