# Skills architecture

NanoClaw has two types of skills that serve different purposes and run in different environments.

## Claude Code skills (`.claude/skills/`)

These run on the **host machine** inside Claude Code. They're instructions for Claude Code to follow when you invoke them with `/skill-name`.

Examples: `/setup`, `/debug`, `/add-telegram`, `/customize`

These handle things that require host access:
- System configuration (installing dependencies, managing services)
- Git operations (merging skill branches, pushing to remotes)
- Environment setup (`.env` files, authentication)
- Anything that modifies the NanoClaw codebase itself

Users interact with these directly. They show up in the skill list and are invoked by name.

## Container agent skills (`container/skills/`)

These run **inside the container** where the Claude agent operates. They're instructions the agent follows at runtime when processing messages.

Examples: `obsidian-notes`, `obsidian-markdown`, `agent-browser`

At startup, `src/container-runner.ts` syncs `container/skills/` into each group's `.claude/skills/` directory inside the container. The agent picks them up automatically based on message content — no slash command needed.

These handle things the agent does in response to user messages:
- Reading and writing files in mounted volumes (Obsidian vault, project repos)
- Following workflows (note creation, draft generation)
- Using reference material (markdown syntax, browser automation)

Users don't invoke these directly. The agent activates them based on context.

## Bridged skills

Some skills span both environments. `/draft` is the clearest example:

```
container/skills/draft/SKILL.md     Agent-side workflow (generate drafts, read voice.md, search notes)
.claude/skills/draft/SKILL.md       Host-side docs + scripts (git push, Playwright for X drafts)
```

The container agent does the creative work (writing drafts, applying voice style). When it needs to do something privileged — push to GitHub, save a tweet draft via browser — it calls an MCP tool that writes an IPC task file. The host picks up the task and runs the corresponding script.

The split follows the security boundary: the container can't access git credentials or browsers, so those operations route through IPC to the host.

## When to use which

| Need | Type | Location |
|------|------|----------|
| Modify the NanoClaw codebase | Claude Code skill | `.claude/skills/` |
| Configure host system (services, env, auth) | Claude Code skill | `.claude/skills/` |
| Agent responds to messages with a workflow | Container skill | `container/skills/` |
| Agent needs reference material | Container skill | `container/skills/` |
| Agent workflow + host-side privileged action | Both (bridged) | Both directories |

## Adding a new skill

**Container-only skill:** Create a directory in `container/skills/` with a `SKILL.md`. It gets synced to agents automatically.

**Claude Code-only skill:** Create a directory in `.claude/skills/` with a `SKILL.md`. It's available immediately as a slash command.

**Bridged skill:** Create both. The container skill defines the agent workflow. The Claude Code skill holds host-side scripts and documentation. Use IPC (MCP tools writing task files to `/workspace/ipc/`) to bridge the two.

See `docs/skills-as-branches.md` for how skills are distributed as git branches.
