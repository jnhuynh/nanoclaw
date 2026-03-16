/**
 * Draft Skill IPC Handler
 *
 * Handles draft_git_push and draft_x_save IPC messages from container agents.
 * Scripts live in .claude/skills/draft/scripts/ and run as subprocesses.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { readEnvFile } from './env.js';

// Read draft-related secrets from .env once at module load
const draftEnv = readEnvFile([
  'GHOST_URL',
  'GHOST_ADMIN_API_KEY',
  'DRAFT_BLOG_REPO_PATH',
  'DRAFT_GIT_BRANCH',
]);

interface SkillResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// Run a skill script as subprocess
async function runScript(script: string, args: object): Promise<SkillResult> {
  const scriptPath = path.join(
    process.cwd(),
    '.claude',
    'skills',
    'draft',
    'scripts',
    `${script}.ts`,
  );

  return new Promise((resolve) => {
    // Merge .env secrets + process.env for the subprocess
    const env: Record<string, string | undefined> = {
      ...process.env,
      ...draftEnv,
      NANOCLAW_ROOT: process.cwd(),
    };
    if (!env.SSH_AUTH_SOCK) {
      try {
        const sock = execSync('launchctl getenv SSH_AUTH_SOCK', {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        if (sock) env.SSH_AUTH_SOCK = sock;
      } catch {
        // SSH agent not available — git push over SSH will fail
      }
    }

    // Ensure the real node binary dir is in PATH (asdf shims can fail under launchd)
    const nodeBinDir = path.dirname(process.execPath);
    if (env.PATH && !env.PATH.includes(nodeBinDir)) {
      env.PATH = `${nodeBinDir}:${env.PATH}`;
    }

    // Use local tsx binary instead of npx (avoids PATH/shim issues in launchd)
    const tsxBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
    const proc = spawn(tsxBin, [scriptPath], {
      cwd: process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    proc.stdin.write(JSON.stringify(args));
    proc.stdin.end();

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ success: false, message: 'Script timed out (120s)' });
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          success: false,
          message: `Script exited with code ${code}: ${stderr.slice(0, 500)}`,
        });
        return;
      }
      try {
        const lines = stdout.trim().split('\n');
        resolve(JSON.parse(lines[lines.length - 1]));
      } catch {
        resolve({
          success: false,
          message: `Failed to parse output: ${stdout.slice(0, 200)}`,
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, message: `Failed to spawn: ${err.message}` });
    });
  });
}

// Write result to IPC results directory
function writeResult(
  dataDir: string,
  sourceGroup: string,
  requestId: string,
  result: SkillResult,
): void {
  const resultsDir = path.join(dataDir, 'ipc', sourceGroup, 'draft_results');
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(
    path.join(resultsDir, `${requestId}.json`),
    JSON.stringify(result),
  );
}

/**
 * Handle draft skill IPC messages
 *
 * @returns true if message was handled, false if not a draft message
 */
export async function handleDraftIpc(
  data: Record<string, unknown>,
  sourceGroup: string,
  isMain: boolean,
  dataDir: string,
): Promise<boolean> {
  const type = data.type as string;

  // Only handle draft_* types
  if (!type?.startsWith('draft_')) {
    return false;
  }

  // Draft skill available to any registered group (host enforces group registration)

  const requestId = data.requestId as string;
  if (!requestId) {
    logger.warn({ type }, 'Draft skill blocked: missing requestId');
    return true;
  }

  logger.info({ type, requestId }, 'Processing draft request');

  let result: SkillResult;

  switch (type) {
    case 'draft_git_push':
      if (!data.directory) {
        result = { success: false, message: 'Missing directory' };
        break;
      }
      result = await runScript('git-push', {
        directory: data.directory,
        commitMessage: data.commitMessage || `draft: ${data.directory}`,
      });
      break;

    case 'draft_ghost_publish':
      if (!data.directory) {
        result = { success: false, message: 'Missing directory' };
        break;
      }
      result = await runScript('ghost-publish-draft', {
        directory: data.directory,
      });
      break;

    default:
      return false;
  }

  writeResult(dataDir, sourceGroup, requestId, result);
  if (result.success) {
    logger.info({ type, requestId }, 'Draft request completed');
  } else {
    logger.error(
      { type, requestId, message: result.message },
      'Draft request failed',
    );
  }
  return true;
}
