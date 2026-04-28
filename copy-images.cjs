const fs = require('fs');
const path = require('path');

const sourceDir = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\758572c3-3ee6-40b7-9eef-6e1e80c72c87';
const destDir = path.join(__dirname, 'public', 'images');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('Created public/images directory');
}

const files = {
  'blood_group_compatibility_guide_1776533659922.png': 'blood_group.png',
  'donation_eligibility_rules_1776533677035.png': 'donation_rules.png',
  'medical_screening_diseases_1776533699462.png': 'medical_screening.png'
};

let success = true;

for (const [srcFile, destFile] of Object.entries(files)) {
  const srcPath = path.join(sourceDir, srcFile);
  const destPath = path.join(destDir, destFile);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`SUCCESS: Copied -> ${destFile}`);
  } else {
    console.log(`ERROR: Could not find -> ${srcPath}`);
    success = false;
  }
}

if (success) {
  console.log('\nAll images successfully copied into your project! You can now check the UI.');
}
