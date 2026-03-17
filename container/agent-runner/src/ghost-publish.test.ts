import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { publishToGhost, createGhostToken } from './ghost-publish.js';

describe('ghost-publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGhostToken', () => {
    it('creates a valid JWT structure', () => {
      const token = createGhostToken('key-id', 'aabbccdd');
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header).toEqual({ alg: 'HS256', typ: 'JWT', kid: 'key-id' });

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload.aud).toBe('/admin/');
      expect(payload.exp - payload.iat).toBe(300);
    });
  });

  describe('publishToGhost', () => {
    it('reads blog-draft.md, extracts title, and posts to Ghost', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        '# My Blog Post\n\nSome content here.\n\nMore content.',
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            posts: [{ id: 'post-123', url: 'https://blog.com/my-post' }],
          }),
      });

      const result = await publishToGhost({
        directory: '20260316-test',
        ghostUrl: 'https://blog.com',
        ghostAdminApiKey: 'keyid:aabbccdd',
        blogRepoPath: '/workspace/projects/pj/huynh.io',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('My Blog Post');
      expect(result.message).toContain('post-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://blog.com/ghost/api/admin/posts/',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Verify the POST body contains the title and markdown content (without title)
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.posts[0].title).toBe('My Blog Post');
      expect(body.posts[0].status).toBe('draft');
    });

    it('returns error for invalid directory name', async () => {
      const result = await publishToGhost({
        directory: '../escape',
        ghostUrl: 'https://blog.com',
        ghostAdminApiKey: 'keyid:aabbccdd',
        blogRepoPath: '/workspace/projects/pj/huynh.io',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid directory');
    });

    it('returns error for invalid API key format', async () => {
      const result = await publishToGhost({
        directory: '20260316-test',
        ghostUrl: 'https://blog.com',
        ghostAdminApiKey: 'no-colon-here',
        blogRepoPath: '/workspace/projects/pj/huynh.io',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid GHOST_ADMIN_API_KEY');
    });

    it('returns error when blog-draft.md not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await publishToGhost({
        directory: '20260316-test',
        ghostUrl: 'https://blog.com',
        ghostAdminApiKey: 'keyid:aabbccdd',
        blogRepoPath: '/workspace/projects/pj/huynh.io',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('returns error on Ghost API failure', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Title\n\nContent');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            errors: [{ message: 'Unauthorized' }],
          }),
      });

      const result = await publishToGhost({
        directory: '20260316-test',
        ghostUrl: 'https://blog.com',
        ghostAdminApiKey: 'keyid:aabbccdd',
        blogRepoPath: '/workspace/projects/pj/huynh.io',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('401');
      expect(result.message).toContain('Unauthorized');
    });

    it('uses directory as fallback title when no heading found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('No heading here, just content.');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            posts: [{ id: 'post-456', url: 'https://blog.com/post' }],
          }),
      });

      const result = await publishToGhost({
        directory: '20260316-fallback-title',
        ghostUrl: 'https://blog.com',
        ghostAdminApiKey: 'keyid:aabbccdd',
        blogRepoPath: '/workspace/projects/pj/huynh.io',
      });

      expect(result.success).toBe(true);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.posts[0].title).toBe('20260316-fallback-title');
    });
  });
});
