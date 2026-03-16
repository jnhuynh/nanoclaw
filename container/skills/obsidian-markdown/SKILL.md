---
name: obsidian-markdown
description: Obsidian-flavored markdown format reference. Covers wikilinks, embeds, frontmatter properties, tags, callouts, and other Obsidian-specific syntax. Use when creating or editing .md files in an Obsidian vault.
allowed-tools: Bash(*), Read, Write, Edit
---

# Obsidian Markdown Reference

## Wikilinks

```markdown
[[Note Name]]                    → Link to a note
[[Note Name|Display Text]]      → Link with custom display text
[[Note Name#Heading]]           → Link to a specific heading
[[Note Name#^block-id]]         → Link to a specific block
```

## Embeds

```markdown
![[note.md]]                    → Embed entire note
![[image.png]]                  → Embed image
![[audio.ogg]]                  → Embed audio player
![[video.mp4]]                  → Embed video
![[document.pdf]]               → Embed PDF
![[note.md#heading]]            → Embed specific section
```

## Frontmatter (Properties)

YAML block at the very top of the file:

```markdown
---
tags:
  - kebab-case-tag
  - another-tag
date: 2026-03-15
aliases:
  - alternate name
cssclasses:
  - custom-class
---
```

Common property types:
- `tags` — list of tags (no `#` prefix in frontmatter)
- `date` — ISO date (YYYY-MM-DD)
- `aliases` — alternative names for the note
- Custom properties — any key-value pairs

## Tags

```markdown
#tag-name                       → Inline tag
#nested/tag                     → Nested tag
```

In frontmatter (preferred for discoverability):
```yaml
tags:
  - tag-name
  - nested/tag
```

Rules:
- Use kebab-case: `#project-planning` not `#ProjectPlanning`
- Tags can contain letters, numbers, hyphens, underscores, forward slashes
- No spaces in tags

## Callouts

```markdown
> [!note] Optional title
> Callout content here

> [!warning]
> Warning content

> [!tip] Pro tip
> Helpful information
```

Types: `note`, `abstract`, `info`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example`, `quote`

Foldable callouts:
```markdown
> [!faq]- Collapsed by default
> Hidden content

> [!faq]+ Expanded by default
> Visible content
```

## Task Lists

```markdown
- [ ] Incomplete task
- [x] Completed task
- [/] In progress (with Tasks plugin)
- [-] Cancelled (with Tasks plugin)
```

## Other Syntax

```markdown
%%This is a comment — not rendered%%

==Highlighted text==

~~Strikethrough~~

| Table | Header |
|-------|--------|
| Cell  | Cell   |

```code block```

$$
LaTeX math block
$$

Inline $math$

```mermaid
graph TD
    A --> B
```
```
