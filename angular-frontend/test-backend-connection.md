# Test Backend Connection

Quick steps to check if backend is working:

1. Check if backend is running:
   - Open: http://localhost:9090/api/auth/test
   - If you get any response (even 404), server is running

2. Test from browser console:
   ```javascript
   fetch('http://localhost:9090/api/hotel-images/all')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```

3. Common issues:
   - Backend not running: Start with ./mvnw spring-boot:run
   - Port blocked: Check firewall
   - CORS error: Check backend CORS settings
   - Token expired: Login again
