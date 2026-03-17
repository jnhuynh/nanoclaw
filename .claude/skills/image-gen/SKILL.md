---
name: image-gen
description: Generate images using fal.ai (flux/schnell). Use for blog headers, social graphics, or creative iteration. Triggers on "generate image", "make an image", "create a header", "image for", or any request to produce visual content.
---

# Image Generation

Generate images from text prompts using fal.ai's flux/schnell model.

## Usage

Run the CLI script from the project root:

```bash
npx tsx scripts/generate-image.ts "<prompt>" [options]
```

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--size` | `-s` | `landscape_4_3` | `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9` |
| `--output` | `-o` | `.` | Output directory |
| `--name` | `-n` | auto | Filename without extension |
| `--model` | `-m` | `fal-ai/flux/schnell` | Model ID. `fal-ai/flux/dev` for higher quality |
| `--format` | `-f` | `jpeg` | `jpeg` or `png` |
| `--seed` | | random | Seed for reproducible results |
| `--count` | `-c` | `1` | Number of images (1-4) |

## Examples

### Blog header image
```bash
npx tsx scripts/generate-image.ts "minimalist watercolor gradient, warm sunset tones, abstract tech motif" \
  --size landscape_16_9 \
  --output ~/Projects/pj/huynh.io/20260316-my-post \
  --name header
```

### Quick iteration
```bash
# First attempt
npx tsx scripts/generate-image.ts "abstract geometric pattern" --seed 42 --output ./images

# Refine prompt, same seed for consistency
npx tsx scripts/generate-image.ts "abstract geometric pattern, bold primary colors" --seed 42 --output ./images
```

### Multiple variations
```bash
npx tsx scripts/generate-image.ts "moody landscape" --count 4 --output ./images
```

### Higher quality (slower)
```bash
npx tsx scripts/generate-image.ts "detailed illustration" --model fal-ai/flux/dev --format png
```

## Notes

- FAL_API_KEY is read from `.env` automatically
- Images are saved locally — check the output path after generation
- The same core module powers both this script and the container agent's `generate_image` MCP tool
