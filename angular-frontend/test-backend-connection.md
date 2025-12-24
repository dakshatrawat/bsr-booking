# Backend Connection Test

## Quick Test Steps:

1. **Check if backend is running:**
   - Open browser and go to: `http://localhost:9090/api/auth/test` (or any public endpoint)
   - Should get a response (even if 404, means server is running)

2. **Test from browser console:**
   ```javascript
   fetch('http://localhost:9090/api/hotel-images/all', {
     method: 'GET',
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN_HERE'
     }
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error);
   ```

3. **Check CORS:**
   - Open browser DevTools → Network tab
   - Look for OPTIONS request (preflight)
   - Check if it returns 200 or is blocked

4. **Common Issues:**
   - Backend not running → Start with: `cd spring-backend && ./mvnw spring-boot:run`
   - Port 9090 blocked → Check firewall/antivirus
   - CORS error → Check CorsConfig.java
   - Authentication token expired → Log out and log back in

