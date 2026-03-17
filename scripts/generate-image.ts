#!/usr/bin/env npx tsx
/**
 * CLI script for generating images with fal.ai.
 * Reads FAL_API_KEY from .env and calls flux/schnell by default.
 *
 * Usage:
 *   npx tsx scripts/generate-image.ts "a sunset over mountains"
 *   npx tsx scripts/generate-image.ts "blog header" --size landscape_16_9 --output ./images --name header
 *   npx tsx scripts/generate-image.ts "test" --model fal-ai/flux/dev --format png --seed 42
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fal } from '@fal-ai/client';
import { generateImage, downloadImage } from '../container/agent-runner/src/fal-image.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadFalKey(): string {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  if (process.env.FAL_API_KEY) return process.env.FAL_API_KEY;

  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('FAL_API_KEY=')) {
        let value = trimmed.slice('FAL_API_KEY='.length).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  }

  console.error('FAL_API_KEY not found in .env or environment');
  process.exit(1);
}

function parseArgs(args: string[]) {
  const parsed: {
    prompt: string;
    size: string;
    output: string;
    name?: string;
    model: string;
    format: 'jpeg' | 'png';
    seed?: number;
    count: number;
  } = {
    prompt: '',
    size: 'landscape_4_3',
    output: '.',
    model: 'fal-ai/flux/schnell',
    format: 'jpeg',
    count: 1,
  };

  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--size' || arg === '-s') { parsed.size = args[++i]; }
    else if (arg === '--output' || arg === '-o') { parsed.output = args[++i]; }
    else if (arg === '--name' || arg === '-n') { parsed.name = args[++i]; }
    else if (arg === '--model' || arg === '-m') { parsed.model = args[++i]; }
    else if (arg === '--format' || arg === '-f') { parsed.format = args[++i] as 'jpeg' | 'png'; }
    else if (arg === '--seed') { parsed.seed = parseInt(args[++i], 10); }
    else if (arg === '--count' || arg === '-c') { parsed.count = parseInt(args[++i], 10); }
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npx tsx scripts/generate-image.ts "<prompt>" [options]

Options:
  --size, -s     Image size preset (default: landscape_4_3)
                 Values: square_hd, square, portrait_4_3, portrait_16_9,
                         landscape_4_3, landscape_16_9
  --output, -o   Output directory (default: current directory)
  --name, -n     Custom filename without extension
  --model, -m    fal.ai model ID (default: fal-ai/flux/schnell)
  --format, -f   Output format: jpeg or png (default: jpeg)
  --seed         Seed for reproducible results
  --count, -c    Number of images to generate, 1-4 (default: 1)`);
      process.exit(0);
    }
    else { positional.push(arg); }
  }

  parsed.prompt = positional.join(' ');
  if (!parsed.prompt) {
    console.error('Error: prompt is required. Usage: npx tsx scripts/generate-image.ts "your prompt"');
    process.exit(1);
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const falKey = loadFalKey();

  fal.config({ credentials: falKey });

  console.log(`Generating image with ${args.model}...`);
  console.log(`Prompt: "${args.prompt}"`);

  const result = await generateImage(fal, {
    prompt: args.prompt,
    model: args.model,
    image_size: args.size,
    num_images: args.count > 1 ? args.count : undefined,
    output_format: args.format !== 'jpeg' ? args.format : undefined,
    seed: args.seed,
  });

  if (!result.images || result.images.length === 0) {
    console.error('No images were generated.');
    process.exit(1);
  }

  for (let i = 0; i < result.images.length; i++) {
    const image = result.images[i];
    const name = args.name
      ? (result.images.length > 1 ? `${args.name}-${i + 1}.${args.format}` : `${args.name}.${args.format}`)
      : `fal-${Date.now()}-${i}.${args.format}`;

    const filePath = await downloadImage(image.url, args.output, name);
    console.log(`Saved: ${filePath} (${image.width}x${image.height})`);
  }

  console.log(`Seed: ${result.seed}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
