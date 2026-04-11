#!/usr/bin/env node
import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const args = process.argv.slice(2)
const command = args[0]

if (!command || command === 'start' || command === 'dev') {
  const viteBin = resolve(projectRoot, 'node_modules/.bin/vite')
  spawn(viteBin, ['--host', '--port', '8648'], { stdio: 'inherit', cwd: projectRoot })
} else if (command === 'build') {
  const viteBin = resolve(projectRoot, 'node_modules/.bin/vite')
  spawn(viteBin, ['build'], { stdio: 'inherit', cwd: projectRoot })
} else {
  console.log(`Usage: hermes-web-ui [command]`)
  console.log()
  console.log('Commands:')
  console.log('  start    Start dev server (default)')
  console.log('  build    Build for production')
}
