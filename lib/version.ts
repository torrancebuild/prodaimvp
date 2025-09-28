// This file is generated automatically by scripts/generate-version.js
// Do not edit manually

import fs from 'fs'
import path from 'path'

export interface VersionInfo {
  commitHash: string
  shortHash: string
  branch: string
  lastCommit: string
  buildTime: string
  version: string
}

let cachedVersion: VersionInfo | null = null

export function getVersionInfo(): VersionInfo {
  if (cachedVersion) {
    return cachedVersion
  }

  try {
    const versionPath = path.join(process.cwd(), 'lib', 'version.json')
    const rawData = fs.readFileSync(versionPath, 'utf-8')
    cachedVersion = JSON.parse(rawData) as VersionInfo
    return cachedVersion
  } catch (error) {
    console.error('Failed to read version info:', error)
    cachedVersion = {
      commitHash: 'unknown',
      shortHash: 'unknown',
      branch: 'unknown',
      lastCommit: 'unknown',
      buildTime: new Date().toISOString(),
      version: '1.0.0'
    }
    return cachedVersion
  }
}

export function getVersionDisplay() {
  const versionInfo = getVersionInfo()
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    version: isProduction ? versionInfo.version : 'dev',
    commit: isProduction ? versionInfo.shortHash : 'local',
    feature: isProduction
      ? versionInfo.lastCommit.toLowerCase().replace(/[^a-z0-9\s]/g, '').substring(0, 20)
      : 'latest'
  }
}
