const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get the current commit hash
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  
  // Get the current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  
  // Get the last commit message
  const lastCommit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim();
  
  // Create version info object
  const versionInfo = {
    commitHash,
    shortHash,
    branch,
    lastCommit,
    buildTime: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Write to a JSON file that can be imported
  const outputPath = path.join(__dirname, '..', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));
  
  console.log('Version info generated:', versionInfo);
} catch (error) {
  console.error('Error generating version info:', error.message);
  // Fallback version info
  const fallbackVersion = {
    commitHash: 'unknown',
    shortHash: 'unknown',
    branch: 'unknown',
    lastCommit: 'unknown',
    buildTime: new Date().toISOString(),
    version: '1.0.0'
  };
  
  const outputPath = path.join(__dirname, '..', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));
}
