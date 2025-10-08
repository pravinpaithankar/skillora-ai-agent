// Quick setup verification script
require('dotenv').config();

console.log('🔍 Checking AI Voice Assistant Setup...\n');

const checks = {
    '✅ Node.js': process.version,
    '✅ Dependencies': 'Checking...'
};

// Check dependencies
const deps = [
    'express', 'helmet', 'express-rate-limit', 'express-validator',
    'winston', 'busboy', 'openai', 'twilio', 'axios', 'cors', 'dotenv'
];

let allDepsOk = true;
deps.forEach(dep => {
    try {
        require(dep);
        console.log(`  ✓ ${dep}`);
    } catch (e) {
        console.log(`  ✗ ${dep} - MISSING!`);
        allDepsOk = false;
    }
});

checks['✅ Dependencies'] = allDepsOk ? 'All installed' : 'Some missing';

console.log('\n📋 Environment Variables:\n');

const envVars = [
    { name: 'OPENAI_API_KEY', required: true },
    { name: 'TWILIO_ACCOUNT_SID', required: false },
    { name: 'TWILIO_AUTH_TOKEN', required: false },
    { name: 'TWILIO_PHONE_NUMBER', required: false },
    { name: 'SARVAM_API_KEY', required: false },
    { name: 'GOOGLE_TRANSLATE_API_KEY', required: false },
    { name: 'PUBLIC_URL', required: false },
    { name: 'PORT', required: false }
];

let hasRequiredVars = true;
envVars.forEach(({ name, required }) => {
    const value = process.env[name];
    const status = value && value !== `your_${name.toLowerCase()}` && value !== 'your_openai_api_key_here'
        ? '✓ Set'
        : required ? '✗ REQUIRED' : '○ Optional (not set)';

    if (required && (!value || value.startsWith('your_'))) {
        hasRequiredVars = false;
    }

    console.log(`  ${status.padEnd(20)} ${name}`);
});

console.log('\n📁 Directory Structure:\n');

const fs = require('fs');
const path = require('path');

const dirs = [
    { path: 'config', file: 'data.js' },
    { path: 'public', file: null },
    { path: 'public/audio', file: null },
    { path: 'temp', file: null },
    { path: 'logs', file: null }
];

dirs.forEach(({ path: dirPath, file }) => {
    const fullPath = path.join(__dirname, dirPath);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✓' : '✗'} ${dirPath}${file ? `/${file}` : ''}`);

    if (!exists && !file) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`    → Created ${dirPath}`);
    }
});

console.log('\n' + '='.repeat(50));
console.log('📊 Summary:\n');

if (allDepsOk) {
    console.log('✅ All dependencies installed');
} else {
    console.log('❌ Some dependencies missing - run: npm install');
}

if (hasRequiredVars) {
    console.log('✅ Required environment variables set');
} else {
    console.log('❌ Missing required variables - check .env file');
    console.log('   OPENAI_API_KEY is required!');
}

console.log('\n💡 Next Steps:');
if (!hasRequiredVars) {
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your OPENAI_API_KEY to .env');
    console.log('3. (Optional) Add Twilio, Sarvam, Google keys');
}
console.log('4. Run: npm start');
console.log('5. Open: http://localhost:3000\n');

if (allDepsOk && hasRequiredVars) {
    console.log('🎉 System is ready to start!\n');
    console.log('Run: npm start\n');
} else {
    console.log('⚠️  Please fix the issues above before starting.\n');
}
