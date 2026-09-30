const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'node_modules', 'cesium', 'Build', 'Cesium');
const targetDir = path.join(__dirname, 'public', 'cesium');

// Copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('Copying Cesium assets to public folder...');
  if (fs.existsSync(sourceDir)) {
    copyDir(sourceDir, targetDir);
    console.log('Cesium assets copied successfully!');
  } else {
    console.warn('Cesium build folder not found. Skipping copy.');
  }
} catch (e) {
  console.error('Failed to copy Cesium assets:', e);
}
