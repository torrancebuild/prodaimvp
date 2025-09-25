// This file is generated automatically by scripts/generate-version.js
// Do not edit manually

export interface VersionInfo {
  commitHash: string;
  shortHash: string;
  branch: string;
  lastCommit: string;
  buildTime: string;
  version: string;
}

let versionInfo: VersionInfo;

try {
  // Try to import the generated version file
  versionInfo = require('./version.json');
} catch (error) {
  // Fallback if version.json doesn't exist
  versionInfo = {
    commitHash: 'unknown',
    shortHash: 'unknown',
    branch: 'unknown',
    lastCommit: 'unknown',
    buildTime: new Date().toISOString(),
    version: '1.0.0'
  };
}

export const getVersionInfo = (): VersionInfo => versionInfo;

export const getVersionDisplay = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    version: isProduction ? versionInfo.version : 'dev',
    commit: isProduction ? versionInfo.shortHash : 'local',
    feature: isProduction ? versionInfo.lastCommit.toLowerCase().replace(/[^a-z0-9\s]/g, '').substring(0, 20) : 'latest'
  };
};
