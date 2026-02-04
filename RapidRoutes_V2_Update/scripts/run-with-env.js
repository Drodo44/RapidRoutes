import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the script to run from command line arguments
const scriptToRun = process.argv[2];
if (!scriptToRun) {
    console.error('Please specify a script to run');
    process.exit(1);
}

const projectRoot = resolve(__dirname, '..');
const scriptPath = resolve(projectRoot, scriptToRun);

// Spawn the target script with all environment variables
const child = spawn('node', [scriptPath], {
    stdio: 'inherit',
    env: process.env
});

child.on('exit', (code) => {
    process.exit(code);
});