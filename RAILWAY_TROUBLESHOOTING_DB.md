# Railway Database Connection Troubleshooting

## Current Issue: Connection Refused

Even though MySQL is running, Spring Boot can't connect.

## Solution: Use Public Proxy URL

Railway provides a public proxy URL that's more reliable than internal networking.

### Update SPRING_DATASOURCE_URL:

Change from:
```
jdbc:mysql://mysql.railway.internal:3306/railway
```

To:
```
jdbc:mysql://turntable.proxy.rlwy.net:34099/railway
```

## Complete Working Configuration:

**Database Variables:**
```
SPRING_DATASOURCE_URL=jdbc:mysql://turntable.proxy.rlwy.net:34099/railway
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=ipSdUdBwzqqALOnfplFeqiRQLvbNdldu
SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.MySQL8Dialect
```

**Other variables remain the same.**

## Why This Works:

- Public proxy URL is always accessible
- Doesn't rely on internal networking
- More reliable for service-to-service communication
- Works across all Railway regions

## After Updating:

1. Save the variable change
2. Railway will auto-redeploy
3. Check logs - should connect successfully
4. Tables will be created automatically on first run

