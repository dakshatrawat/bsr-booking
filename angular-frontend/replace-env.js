// Script to replace API_URL in environment.prod.ts during Vercel build
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, 'src/environments/environment.prod.ts');
const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://bsr-booking-production.up.railway.app/api';

console.log('Starting environment file update...');
console.log('API_URL from env:', process.env.API_URL || 'not set, using default');
console.log('Using API URL:', apiUrl);

// Ensure directory exists
const envDir = path.dirname(envFile);
if (!fs.existsSync(envDir)) {
  console.log('Creating environments directory...');
  fs.mkdirSync(envDir, { recursive: true });
}

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

try {
  fs.writeFileSync(envFile, content, 'utf8');
  console.log(`✓ Successfully updated environment.prod.ts`);
  console.log(`✓ API URL set to: ${apiUrl}`);
  
  // Verify file was written
  const writtenContent = fs.readFileSync(envFile, 'utf8');
  console.log('✓ File verification successful');
} catch (error) {
  console.error('✗ Error writing environment file:', error);
  console.error('Error details:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

