---
description: Manage local worktrees with add, delete, and merge
agent: build
---

Manage a Git worktree using the operation and arguments received after `/worktree`.

## Operations

### `/worktree add <name>`

- Use all text received after `add` as the worktree name.
- Replace each space with a hyphen (`-`).
- Run `git worktree add -b <normalized-name> .worktrees/<normalized-name>`.
- If the worktree or branch already exists, report the error and do not run alternative commands.

### `/worktree delete <name>`

- Use all text received after `delete` as the worktree name.
- Replace each space with a hyphen (`-`).
- Run `git worktree remove .worktrees/<normalized-name>`.
- If removal fails because there are uncommitted changes, report the error and do not force removal.
- After successfully removing the worktree, run `git branch -d <normalized-name>` to delete its local branch.
- If the branch is not fully merged, do not use `-D`; report the error and preserve the branch.

### `/worktree merge <name>`

- Use all text received after `merge` as the worktree name.
- Replace each space with a hyphen (`-`).
- The root worktree is the directory containing `.git`, not `.worktrees/<normalized-name>`.
- Run commands from the root worktree.
- Confirm that the root worktree is clean before merging; if it has uncommitted changes, report the error and do not merge.
- Run `git merge <normalized-name>` to merge the worktree branch into the currently active branch in the root worktree.
- If there are conflicts, report that the merge requires manual resolution and do not run commands to discard them.
- Do not remove or modify the source worktree after merging.

Instructions:
- The operation must be exactly `add`, `delete`, or `merge`.
- If the operation or its argument is missing, request the missing value before running commands.
- Do not run Git commands other than those specified for the requested operation.
- Do not modify additional files.

Received arguments:

$ARGUMENTS
