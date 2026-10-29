# Start each conversation on latest main

At the start of every new conversation, before handling the user's task:

1. Check the repository's working tree and current branch.
2. Run `git fetch origin main` from the repository root.
3. If the working tree is clean, switch to `main` (create it tracking `origin/main` if absent), then run `git merge --ff-only origin/main`.
4. Confirm that `HEAD` matches `origin/main`, and re-read this file after updating.

Never discard local changes, reset local commits, or force a branch switch to meet this instruction. If local changes or divergent commits prevent the update, preserve them and report the blocker. If fetching fails, report that the latest remote state could not be verified; do not claim the checkout is current. Use the available network permission mechanism when needed.

Explicit user instructions to use a different branch take precedence. Synchronize once per conversation, not before every turn, so ongoing work is preserved.

# Default workflow: reading journal

This repository is the user's personal technical reading journal. The normal input is a pasted article URL, with no additional instructions.

- Treat a URL-only message (including a Markdown link) to a technical article, paper, research post, or technical repository as a request to create or update a reading journal entry, not merely to summarize it in chat.
- Before processing the link, read and apply `.agents/skills/technical-reading-journal/SKILL.md` and its `references/journal-format.md`, even if the skill is missing from the session's advertised skill list.
- Use this repository's `reading-journal/` as the journal root. Check for an existing canonical source URL, save or update the entry, and update and verify `reading-journal/catalog.md` as the skill specifies.
- Do not ask whether the user wants to save the note; a pasted article URL authorizes this workflow.
- Explicit user requests take precedence. A question about a link or a request for a different operation should be handled as requested.
- Follow applicable content and copyright constraints. If complete source reproduction is not permitted, preserve the workflow's useful research and annotation goals using an original, sourced note with brief permitted excerpts, and clearly disclose the format limitation. Never imply omitted source text was preserved.
- Report the saved entry path and catalog update. If retrieval fails, follow the skill's access-failure instructions and report the limitation accurately.
