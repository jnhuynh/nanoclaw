/**
 * Ghost CMS draft publishing.
 * Shared between the container MCP tool and the host CLI script.
 *
 * Reads blog-draft.md from a thesis directory, extracts the title,
 * and creates a draft post via the Ghost Admin API.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface GhostPublishOptions {
  directory: string;
  ghostUrl: string;
  ghostAdminApiKey: string;
  blogRepoPath: string;
}

export interface GhostPublishResult {
  success: boolean;
  message: string;
}

export function createGhostToken(id: string, secret: string): string {
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

export async function publishToGhost(
  options: GhostPublishOptions,
): Promise<GhostPublishResult> {
  const { directory, ghostUrl, ghostAdminApiKey, blogRepoPath } = options;

  if (!/^[\w-]+$/.test(directory)) {
    return { success: false, message: `Invalid directory name: ${directory}` };
  }

  const [keyId, keySecret] = ghostAdminApiKey.split(':');
  if (!keyId || !keySecret) {
    return {
      success: false,
      message: 'Invalid GHOST_ADMIN_API_KEY format. Expected {id}:{secret}',
    };
  }

  const draftPath = path.join(blogRepoPath, directory, 'blog-draft.md');
  if (!fs.existsSync(draftPath)) {
    return { success: false, message: `Blog draft not found: ${draftPath}` };
  }

  const markdown = fs.readFileSync(draftPath, 'utf-8');

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : directory;

  const content = titleMatch
    ? markdown.replace(/^#\s+.+\n*/, '').trim()
    : markdown.trim();

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
        posts: [{ title, mobiledoc, status: 'draft' }],
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
