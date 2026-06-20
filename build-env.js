const fs = require('fs');
const path = require('path');

const envContent = `window.__env = {
  SUPABASE_URL: "${process.env.SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ''}"
};`;

const dir = path.join(__dirname, 'assets');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

fs.writeFileSync(path.join(dir, 'env.js'), envContent, 'utf-8');
console.log('Successfully generated assets/env.js with build environment variables.');
