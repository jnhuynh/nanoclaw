---
name: image-gen
description: Generate images using fal.ai (flux/schnell). Use for blog headers, social graphics, or creative iteration. Triggered by image generation requests.
---

# Image Generation

Use the `generate_image` MCP tool to create images from text prompts.

## Quick Usage

```
mcp__nanoclaw__generate_image(prompt: "a minimalist blog header with abstract geometric shapes")
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `prompt` | *required* | Text description of the image |
| `image_size` | `landscape_4_3` | `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9` |
| `num_images` | `1` | Generate 1-4 images at once |
| `output_format` | `jpeg` | `jpeg` or `png` |
| `seed` | random | Fixed seed for reproducible results |
| `output_dir` | `/workspace/group` | Where to save the image files |
| `filename` | auto | Custom filename without extension |
| `model` | `fal-ai/flux/schnell` | Model ID. Use `fal-ai/flux/dev` for higher quality (slower) |

## Common Patterns

### Blog header image
```
mcp__nanoclaw__generate_image(
  prompt: "minimalist watercolor gradient, warm sunset tones, abstract tech motif",
  image_size: "landscape_16_9",
  output_dir: "/workspace/projects/pj/huynh.io/20260316-my-post",
  filename: "header"
)
```

### Iterate on an image
Generate with a seed, then refine the prompt while keeping the seed for consistency:
```
mcp__nanoclaw__generate_image(prompt: "first attempt", seed: 42)
# Refine...
mcp__nanoclaw__generate_image(prompt: "refined attempt keeping same composition", seed: 42)
```

### Multiple variations
```
mcp__nanoclaw__generate_image(prompt: "abstract pattern", num_images: 4)
```

### Higher quality (slower)
```
mcp__nanoclaw__generate_image(prompt: "detailed illustration", model: "fal-ai/flux/dev")
```
