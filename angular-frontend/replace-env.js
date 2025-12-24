// Script to replace API_URL in environment.prod.ts during Vercel build
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, 'src/environments/environment.prod.ts');
const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.com/api';

// Ensure directory exists
const envDir = path.dirname(envFile);
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

try {
  fs.writeFileSync(envFile, content, 'utf8');
  console.log(`✓ Updated environment.prod.ts with API_URL: ${apiUrl}`);
} catch (error) {
  console.error('✗ Error writing environment file:', error);
  process.exit(1);
}

