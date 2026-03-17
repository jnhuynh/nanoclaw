import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { FalClient } from './fal-image.js';

// Mock fs.mkdirSync and fs.writeFileSync
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { generateImage, downloadImage } from './fal-image.js';

function createMockFal() {
  return { subscribe: vi.fn<FalClient['subscribe']>() };
}

describe('fal-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateImage', () => {
    it('calls fal.subscribe with correct model and prompt', async () => {
      const fal = createMockFal();
      fal.subscribe.mockResolvedValue({
        data: {
          images: [{ url: 'https://fal.ai/image.jpg', width: 1024, height: 768 }],
          seed: 42,
        },
      });

      const result = await generateImage(fal, { prompt: 'a sunset over mountains' });

      expect(fal.subscribe).toHaveBeenCalledWith(
        'fal-ai/flux/schnell',
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: 'a sunset over mountains',
            image_size: 'landscape_4_3',
            num_inference_steps: 4,
          }),
        }),
      );
      expect(result.images).toHaveLength(1);
      expect(result.images[0].url).toBe('https://fal.ai/image.jpg');
    });

    it('passes custom options through', async () => {
      const fal = createMockFal();
      fal.subscribe.mockResolvedValue({
        data: {
          images: [{ url: 'https://fal.ai/image.png', width: 1024, height: 1024 }],
          seed: 99,
        },
      });

      await generateImage(fal, {
        prompt: 'test',
        image_size: 'square_hd',
        num_images: 2,
        output_format: 'png',
        seed: 99,
        model: 'fal-ai/flux/dev',
      });

      expect(fal.subscribe).toHaveBeenCalledWith(
        'fal-ai/flux/dev',
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: 'test',
            image_size: 'square_hd',
            num_images: 2,
            output_format: 'png',
            seed: 99,
          }),
        }),
      );
    });
  });

  describe('downloadImage', () => {
    it('downloads image from URL and saves to disk', async () => {
      const fakeBuffer = Buffer.from('fake-image-data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeBuffer.buffer),
      });

      const filePath = await downloadImage(
        'https://fal.ai/image.jpg',
        '/workspace/group',
        'header.jpg',
      );

      expect(mockFetch).toHaveBeenCalledWith('https://fal.ai/image.jpg');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/workspace/group', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/workspace/group', 'header.jpg'),
        expect.any(Buffer),
      );
      expect(filePath).toBe(path.join('/workspace/group', 'header.jpg'));
    });

    it('generates filename from URL when not provided', async () => {
      const fakeBuffer = Buffer.from('fake-image-data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeBuffer.buffer),
      });

      const filePath = await downloadImage(
        'https://fal.ai/outputs/abc123.png',
        '/workspace/group',
      );

      expect(filePath).toMatch(/\.png$/);
    });

    it('throws on failed fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        downloadImage('https://fal.ai/missing.jpg', '/workspace/group'),
      ).rejects.toThrow('Failed to download image: 404 Not Found');
    });
  });
});
