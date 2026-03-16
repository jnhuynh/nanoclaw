#!/usr/bin/env npx tsx
/**
 * Draft Skill - Publish Draft to Ghost
 * Creates a draft post on Ghost via the Admin API.
 * Reads blog-draft.md from the thesis directory and pushes it as a Ghost draft.
 *
 * Usage: echo '{"directory":"20260316-slug"}' | npx tsx ghost-publish-draft.ts
 *
 * Required env vars: GHOST_URL, GHOST_ADMIN_API_KEY
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface GhostPublishInput {
  directory: string;
}

interface ScriptResult {
  success: boolean;
  message: string;
}

function createGhostToken(id: string, secret: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }),
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' }),
  ).toString('base64url');

  const secretBytes = Buffer.from(secret, 'hex');
  const signature = crypto
    .createHmac('sha256', secretBytes)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

async function readInput<T>(): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error(`Invalid JSON input: ${err}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

async function ghostPublish(
  input: GhostPublishInput,
): Promise<ScriptResult> {
  const { directory } = input;

  if (!/^[\w-]+$/.test(directory)) {
    return { success: false, message: `Invalid directory name: ${directory}` };
  }

  const ghostUrl = process.env.GHOST_URL;
  const ghostKey = process.env.GHOST_ADMIN_API_KEY;

  if (!ghostUrl) {
    return {
      success: false,
      message: 'Missing GHOST_URL in .env (e.g., https://huynh.io)',
    };
  }
  if (!ghostKey) {
    return {
      success: false,
      message: 'Missing GHOST_ADMIN_API_KEY in .env',
    };
  }

  const [keyId, keySecret] = ghostKey.split(':');
  if (!keyId || !keySecret) {
    return {
      success: false,
      message: 'Invalid GHOST_ADMIN_API_KEY format. Expected {id}:{secret}',
    };
  }

  // Read blog draft from the thesis directory
  const repoPath =
    process.env.DRAFT_BLOG_REPO_PATH ||
    path.join(os.homedir(), 'Projects', 'pj', 'huynh.io');
  const draftPath = path.join(repoPath, directory, 'blog-draft.md');

  if (!fs.existsSync(draftPath)) {
    return { success: false, message: `Blog draft not found: ${draftPath}` };
  }

  const markdown = fs.readFileSync(draftPath, 'utf-8');

  // Extract title from first # heading
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : directory;

  // Remove the title line from content
  const content = titleMatch
    ? markdown.replace(/^#\s+.+\n*/, '').trim()
    : markdown.trim();

  // Create mobiledoc with markdown card (Ghost renders it natively)
  const mobiledoc = JSON.stringify({
    version: '0.3.1',
    markups: [],
    atoms: [],
    cards: [['markdown', { markdown: content }]],
    sections: [[10, 0]],
  });

  const token = createGhostToken(keyId, keySecret);
  const apiUrl = `${ghostUrl.replace(/\/+$/, '')}/ghost/api/admin/posts/`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Ghost ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        posts: [
          {
            title,
            mobiledoc,
            status: 'draft',
          },
        ],
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      const errors =
        body.errors
          ?.map((e: { message: string }) => e.message)
          .join(', ') || JSON.stringify(body);
      return {
        success: false,
        message: `Ghost API error (${response.status}): ${errors}`,
      };
    }

    const post = body.posts?.[0];
    return {
      success: true,
      message: `Ghost draft created: "${title}" (id: ${post?.id}, url: ${post?.url})`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to create Ghost draft: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function main(): Promise<void> {
  try {
    const input = await readInput<GhostPublishInput>();
    const result = await ghostPublish(input);
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(
      JSON.stringify({
        success: false,
        message: `Script execution failed: ${err instanceof Error ? err.message : String(err)}`,
      }),
    );
    process.exit(1);
  }
}

main();
