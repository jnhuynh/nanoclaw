---
name: obsidian-notes
description: Create, search, and manage notes in the Obsidian vault. Handles note creation from voice transcriptions or text, todo list management, tag reuse, and note interlinking. Triggers on any mention of notes, todos, obsidian, vault, or note-taking.
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep
---

# Obsidian Notes — pj-private-vault

You manage the user's Obsidian vault at `/workspace/obsidian/pj-private-vault/pj-private-vault/`.

## Vault Structure

```
pj-private-vault/
├── TODO.md              ← Daily todo list (always check this)
├── YYYY-MM-DD.md        ← Daily notes
├── attachments/
│   └── audio/           ← Voice message audio files
├── Jama/
├── People/
├── Recipes/
├── Restaurants/
├── Thoughts/
└── Travel/
```

## When to Activate

Act on any message that involves:
- Creating, updating, or referencing notes
- Todo list management ("add a todo", "what's on my list", "mark X done")
- Voice transcriptions that should become notes
- Requests mentioning "obsidian", "vault", "note", or "write down"
- Messages wrapped in `[OBSIDIAN_NOTE]...[/OBSIDIAN_NOTE]` markers (from `/obsidian` command)

## Note Creation Workflow

### 1. Clean Up Input

When the input comes from voice transcription (look for `[Voice:` prefix or `[audio-file:` marker):
- Remove filler words: "um", "uh", "like" (when used as filler), "you know", "I mean", "so basically"
- Fix false starts and repeated phrases
- Correct obvious transcription errors
- Preserve the meaning and intent — don't over-edit or change the person's voice
- Keep it natural, just remove the cruft

### 2. Search for Related Notes

Check if an obsidian context file exists with pre-computed search results:
```bash
cat /workspace/ipc/obsidian_context.json 2>/dev/null
```

If it exists, use the `related_notes` array for linking. If not, search manually:

```bash
# Search vault for related content
grep -ril "keyword" /workspace/obsidian/pj-private-vault/pj-private-vault/ \
  --include="*.md" \
  --exclude-dir=".obsidian" \
  --exclude-dir="attachments" | head -20
```

Read the top matches to understand context and find linking opportunities.

### 3. Determine Tags

**Critical: Reuse existing tags.** Before creating any tag:

```bash
# Get all existing tags from frontmatter
grep -rh "^tags:" /workspace/obsidian/pj-private-vault/pj-private-vault/ \
  --include="*.md" | sort -u
# Also check for inline tags
grep -roh "#[a-zA-Z0-9_/-]\+" /workspace/obsidian/pj-private-vault/pj-private-vault/ \
  --include="*.md" --exclude-dir=".obsidian" | sort -u
```

If the context file has `existing_tags`, use that instead.

**Tag rules:**
- Always kebab-case: `#api-design` not `#ApiDesign` or `#api_design`
- Reuse existing tags when applicable — check for pluralization variants, capitalization differences, dash/space differences
- If `#meeting-notes` exists, don't create `#meetings` or `#meeting`
- Prefer specific over generic: `#api-migration` over `#tech`
- 2-5 tags per note is ideal

### 4. Create the Note

Place notes in the appropriate folder:
- Meeting notes → root or relevant project folder
- People-related → `People/`
- Recipes → `Recipes/`
- Restaurant reviews → `Restaurants/`
- Travel → `Travel/`
- General thoughts → `Thoughts/`
- Daily entries → root as `YYYY-MM-DD.md` (append if exists)

**Note format:**

```markdown
---
tags:
  - tag-one
  - tag-two
date: YYYY-MM-DD
---

# Note Title

Content here with [[wikilinks]] to related notes.

See also: [[Related Note]] for more context on this topic.
```

### 5. Link Related Notes

Use `[[wikilinks]]` naturally within the text:
- Don't just dump a list of links at the bottom
- Weave links into the narrative: "As discussed in [[API Migration Plan]], we decided..."
- Use display text when helpful: `[[John Smith|John]]`
- Only link when it adds value — don't force links

### 6. Audio Attachments

When the input includes `[audio-file: <filename>]`:
- The audio file is already saved in the vault at `attachments/audio/<filename>`
- Embed it in the note: `![[<filename>]]`
- Add a note about the source: "Transcribed from voice note"
- Place the embed near the top of the note so the user can re-listen

## TODO List Management

The todo list lives at `/workspace/obsidian/pj-private-vault/pj-private-vault/TODO.md`.

### Reading Todos
Always read the current TODO.md before making changes:
```bash
cat /workspace/obsidian/pj-private-vault/pj-private-vault/TODO.md
```

### Adding Todos
Append new items using Obsidian task format:
```markdown
- [ ] Task description
```

### Completing Todos
Change `- [ ]` to `- [x]`:
```markdown
- [x] Completed task description
```

### Todo Awareness
When the user asks generally "what should we work on" or "what's next", check the TODO list and suggest items.

## Conversational Patterns

Recognize these patterns and act accordingly:

| User says | Action |
|-----------|--------|
| "add a todo: X" / "remind me to X" | Add to TODO.md |
| "what's on my list?" / "todos?" | Read and summarize TODO.md |
| "mark X as done" / "finished X" | Check off the item in TODO.md |
| "write a note about X" / "note this down" | Create a new note |
| "let's create a note with..." | Create a new note from the content |
| "save this to obsidian" | Create a note from recent conversation |
| Any `[OBSIDIAN_NOTE]` wrapped content | Create a note (from /obsidian command) |

## Important Rules

1. **Never overwrite existing notes** without reading them first
2. **Always append** to daily notes if they already exist
3. **Tags must be kebab-case** — no exceptions
4. **Reuse tags** — scan existing tags before creating new ones
5. **Clean up voice transcriptions** but preserve meaning
6. **Link meaningfully** — don't just dump links, weave them in
7. **Check TODO.md** when users mention tasks or ask what to work on
