Run a speckit simpsons command on a project with full preflight setup.

## Arguments

$ARGUMENTS - Format: `<project> <command> [prompt]`
- project: directory name under ~/Projects
- command: specify | pipeline | implement/ralph | clarify/homer | analyze/lisa
- prompt (optional): additional context for the speckit command

## Command Map

| Alias | Speckit Command |
|-------|----------------|
| specify | /speckit.specify |
| pipeline | /speckit.pipeline |
| implement, ralph | /speckit.ralph.implement |
| clarify, homer | /speckit.homer.clarify |
| analyze, lisa | /speckit.lisa.analyze |

## Instructions

Parse the arguments to extract project, command, and optional prompt. Then execute the following steps in order:

### 1. Validate inputs

- Confirm the project directory exists at `~/Projects/<project>`
- Confirm the command is one of: specify, pipeline, implement, ralph, clarify, homer, analyze, lisa
- If invalid, tell the user and stop

### 2. Preflight: Ensure skill repos

Clone or pull these repos into `<project>/.claude/skills/`:

- `https://github.com/github/spec-kit.git` -> `.claude/skills/spec-kit`
- `https://github.com/jnhuynh/spec-kit-simpsons-loops.git` -> `.claude/skills/spec-kit-simpsons-loops`

If the directory has a `.git` folder, run `git pull --ff-only`. Otherwise clone fresh (remove stale non-git directory first if it exists).

### 3. Preflight: Merge global CLAUDE.md

The project's `CLAUDE.md` has two sections separated by this delimiter:

```
<!-- ====== PROJECT SPECIFIC ====== -->
```

Replace everything **above** the delimiter with the global template below. Preserve everything from the delimiter onwards (the project-specific section). If the file doesn't exist, create it with just the global template. If it exists but has no delimiter, prepend the global template followed by two newlines before the existing content.

<global-claude-md>
# Development Guidelines

## Code Principles

- **Readability first** — clean, human-readable code with meaningful variable names. Clarity over brevity.
- **Functional design** — services take inputs, yield deterministic outputs. No hidden side effects.
- **Maintainability over cleverness** — no premature optimizations. Code must be maintainable by developers who didn't write it.
- **Simplicity (KISS & YAGNI)** — build only what's needed. Prefer simpler solutions that can be validated before investing in sophisticated alternatives.
- **Follow best practices** — established conventions for the languages, frameworks, and packages in use. Community standards over novel approaches.

## Test-First Development

Unit tests for new logic MUST be written before the implementation code:

1. Write the test
2. Run it — verify it **fails**
3. Write the minimum implementation to make it pass

Applies to: new service functions, business logic, hooks, utilities, and bug fixes (reproduce the bug in a test first). Never proceed with failing tests.

## Quality Gates

All changes must pass before committing:

- All tests pass
- Linting passes with zero errors
- Type checking passes with zero errors (typed languages)

## Git Discipline

- **Never push without explicit permission** — commits are fine, pushing is gated
- Commit format: `type(scope): [ticket] description`
- One logical change per commit
- Branch naming follows spec directory: `XXXX-type-description` where type is `feat`, `fix`, or `chore`

## Process Hygiene

Cleanup is mandatory. Every process started during a session must be stopped before the session ends. A session that completes but leaves orphaned processes is **incomplete**.

- **Dev servers**: before starting one, check if one is already running (`pgrep -f "vite\\|webpack-dev-server\\|next dev\\|rails s"`). Reuse it — never start a duplicate.
- **Docker**: any container started during this session MUST be stopped and removed before finishing. Use `docker stop <id> && docker rm <id>`, or `docker compose down`. Never leave containers running.
- **Watchers, file observers, background build processes**: stop all of them when done.
- **Verification step**: before marking work complete, run `ps aux | grep <project-pattern>` to confirm nothing from this session is still running.
- Verify UI and integration work against the running application. Unit tests alone are insufficient.

## Speckit

- Constitution at `.specify/memory/constitution.md` is **authoritative** — never modify it during implementation
- Adjust spec, plan, or tasks instead
- **Homer (clarify)** → fix one finding per iteration, loop until `ALL_FINDINGS_RESOLVED`
- **Lisa (analyze)** → fix one finding per iteration, loop until `ALL_FINDINGS_RESOLVED`
- **Ralph (implement)** → implement one task per iteration, loop until `ALL_TASKS_COMPLETE`
- Exit after each iteration — restart with fresh context

<!-- ====== PROJECT SPECIFIC ====== -->

<!-- Add project-specific guidelines below (technologies, commands, structure, etc.) -->
</global-claude-md>

### 4. Preflight: Merge global constitution

Same merge logic as CLAUDE.md, but for the file `.specify/memory/constitution.md` using this template:

<global-constitution>
# Constitution

## Core Principles

### I. Readability First

Code MUST be clean and human-readable with meaningful variable names. Descriptive
names that convey intent are required. Clarity MUST be prioritized over brevity.

**Rationale**: Readable code reduces cognitive load, speeds up onboarding, and
minimizes bugs caused by misunderstanding.

### II. Functional Design

Services MUST take inputs and yield deterministic outputs. Business logic functions
MUST NOT create side effects. Given the same inputs, functions MUST produce the
same results.

**Rationale**: Pure functions are easier to test, reason about, and compose. They
enable confident refactoring and reduce hidden dependencies.

### III. Maintainability Over Cleverness

The codebase values longevity over clever code. Premature optimizations are
prohibited. Code MUST be maintainable by future developers who did not write it.

**Rationale**: Clever code impresses once but costs repeatedly. Maintainable code
enables sustainable development velocity over the project lifetime.

### IV. Best Practices

All code MUST follow established conventions for the languages, frameworks, and
packages in use. Community standards and idioms MUST be adhered to. Proven patterns
SHOULD be leveraged over novel approaches.

**Rationale**: Best practices encode collective wisdom. Following them reduces
surprises and enables developers to apply existing knowledge.

### V. Simplicity (KISS & YAGNI)

Implementations MUST be kept simple and straightforward. Features MUST NOT be
built until needed. Simpler solutions that can be validated MUST be preferred
before investing in sophisticated alternatives.

**Rationale**: Complexity is the enemy of reliability. Simple solutions are faster
to build, easier to verify, and cheaper to change.

## Development Standards

### Spec & Branch Naming Convention

All specification directories and their corresponding Git branches MUST follow
the naming pattern:

```
XXXX-type-description
```

Where:

- `XXXX` is a 4-character alphanumeric ID derived from the last 4 characters of a UUID
- `type` is **MANDATORY** and MUST be one of: `feat` (new feature), `fix` (bug fix), or `chore` (maintenance/refactor)
- `description` is a kebab-case summary of the spec purpose

**The type segment is NEVER optional.** Omitting the type violates this convention.

**Git Branch Rule**: The Git branch name MUST exactly match the spec directory name.

### Test-First Development

Unit tests for new logic MUST be written before the implementation code. Tests MUST
be executed and verified to FAIL before implementation begins. The implementation is
then written to make the failing tests pass.

This applies to:

- New service functions and business logic
- New hooks and utilities
- Bug fixes (write a test that reproduces the bug, verify it fails, then fix)

**Rationale**: Writing tests first proves they validate the intended behavior and
prevents false-positive test suites. It drives minimal, focused implementations and
provides immediate feedback during development.

### Dev Server Verification

When implementing features that involve web UI or API changes, the development
server MUST be used for implementation verification:

1. **Pre-check**: Check whether a dev server is already running. Reuse it — do NOT
   start a duplicate.
2. **Startup**: If none is running, start it before implementation work requiring
   verification.
3. **Verification**: Implemented features MUST be verified against the running dev
   server. Unit tests alone are insufficient for UI and integration work.
4. **Cleanup**: Stop any dev server processes started during the session when
   implementation is complete.
5. **Process hygiene**: Do NOT leave straggling processes (dev servers, watchers,
   child processes) in the background.

**Rationale**: Verifying against the running application catches integration
issues that unit tests miss. Enforcing cleanup prevents resource leaks and port
conflicts.

### Process Cleanup (Mandatory)

**Every process started during a session MUST be stopped when the session ends.**
This is a hard rule with no exceptions — not for happy paths, not for error paths,
not for "I'll clean it up later."

Scope: dev servers, test watchers, Docker containers, background build processes,
file watchers, any subprocess spawned for the task.

**Docker**: any `docker run` or `docker compose up` invocation MUST be paired with
cleanup before the session completes:

```bash
docker stop <id> && docker rm <id>
# or
docker compose down
```

Never leave containers running after work is done. `docker ps` MUST be clean.

**Verification**: Before declaring work complete, confirm cleanup:

```bash
ps aux | grep <project-pattern>   # no straggling processes
docker ps                          # no running containers from this session
```

**Failure to clean up is a constitution violation** equivalent to leaving failing
tests. It degrades the environment for future sessions and causes the exact resource
leak and port conflict problems this constitution is designed to prevent.

**Rationale**: Orphaned processes accumulate silently — they waste memory, hold
ports, and cause confusing interference in future sessions. Mandatory cleanup keeps
the environment predictable and the host machine healthy.

## Quality Gates

All code changes MUST pass the following gates before merge:

- All tests MUST pass
- Linting MUST pass with zero errors
- Type checking MUST pass with zero errors (typed languages)

## Governance

This constitution supersedes ad-hoc practices and informal conventions. All
development decisions SHOULD align with the principles defined herein.

**Amendment Process**:

1. Propose amendment with documented rationale
2. Review impact on existing code and workflows
3. Update constitution with appropriate version bump:
   - MAJOR: Backward-incompatible principle changes or removals
   - MINOR: New principles or materially expanded guidance
   - PATCH: Clarifications, wording fixes, non-semantic refinements
4. Propagate changes to dependent templates and documentation

**Compliance**: All pull requests and code reviews MUST verify alignment with
constitutional principles. Violations require justification or remediation.

**Evolution**: This constitution will evolve as the project matures. Principles
may be added, refined, or deprecated based on project needs and lessons learned.

<!-- ====== PROJECT SPECIFIC ====== -->

<!-- Add project-specific standards below (language tooling, formatting, lint rules, etc.) -->
</global-constitution>

### 5. Preflight: Ensure quality gates

If `.specify/quality-gates.sh` does NOT already exist, generate one based on the project structure:

- **Node.js** (package.json exists): add `npm test`, `npm run lint`, `npm run typecheck` / `npm run type-check` / `npx tsc --noEmit` based on what's available in scripts and devDependencies
- **Ruby** (Gemfile exists): add `bundle exec rspec`, optionally `bundle exec rubocop` if `.rubocop.yml` exists
- **Python** (pyproject.toml or requirements.txt): add `pytest`, optionally `ruff check .` / `flake8 .` / `mypy .` based on pyproject.toml contents
- **Go** (go.mod exists): add `go test ./...` and `go vet ./...`
- **Rust** (Cargo.toml exists): add `cargo test` and `cargo clippy -- -D warnings`

Make the script executable. Never overwrite an existing quality-gates.sh.

### 6. Launch claude in tmux

Create a tmux session and run claude:

```bash
SESSION_NAME="simpsons-<project>-$(date +%s | tail -c 7)"
tmux new-session -d -s "$SESSION_NAME" -c ~/Projects/<project> \
  "claude -p '<speckit-command> <prompt>' --dangerously-skip-permissions 2>&1 | tee /tmp/${SESSION_NAME}.log; echo \${PIPESTATUS[0]} > /tmp/${SESSION_NAME}.done"
```

Map the command to its speckit equivalent using the command map above.

### 7. Report

Tell the user:
- The session name and how to attach: `tmux attach -t <session-name>`
- Which preflight steps were performed (skills updated/cloned, files merged, quality gates generated)
- The speckit command that was launched
