/**
 * fal.ai image generation utilities.
 * Shared between the container MCP tool and the host CLI script.
 *
 * Uses dependency injection for the fal client to avoid coupling
 * to a specific node_modules resolution path.
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_MODEL = 'fal-ai/flux/schnell';

export interface FalClient {
  subscribe(
    model: string,
    options: { input: Record<string, unknown> },
  ): Promise<{ data: unknown }>;
}

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  image_size?: string;
  num_images?: number;
  num_inference_steps?: number;
  output_format?: 'jpeg' | 'png';
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  content_type?: string;
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  seed: number;
}

export async function generateImage(
  fal: FalClient,
  options: GenerateImageOptions,
): Promise<GenerateImageResult> {
  const model = options.model || DEFAULT_MODEL;

  const result = await fal.subscribe(model, {
    input: {
      prompt: options.prompt,
      image_size: options.image_size || 'landscape_4_3',
      num_inference_steps: options.num_inference_steps || 4,
      ...(options.num_images && { num_images: options.num_images }),
      ...(options.output_format && { output_format: options.output_format }),
      ...(options.seed !== undefined && { seed: options.seed }),
    },
  });

  const data = result.data as {
    images: GeneratedImage[];
    seed: number;
  };

  return {
    images: data.images,
    seed: data.seed,
  };
}

export async function downloadImage(
  url: string,
  outputDir: string,
  filename?: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`,
    );
  }

  fs.mkdirSync(outputDir, { recursive: true });

  if (!filename) {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath) || '.jpg';
    filename = `fal-${Date.now()}${ext}`;
  }

  const filePath = path.join(outputDir, filename);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}
