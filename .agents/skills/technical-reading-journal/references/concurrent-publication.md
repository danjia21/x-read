# Concurrent generation and publication

Use this protocol for every journal worker. Entry generation may overlap, while Git fast-forward checks serialize publication.

## Isolation

1. Resolve `origin`'s default branch. Fetch it with `--no-write-fetch-head` into a unique ref under `refs/journal-workers/`, then resolve that ref to an immutable commit OID.
2. Create a unique temporary directory and detached worktree at that OID. Use only this worktree for duplicate detection, entry editing, validation, staging, and commits.
3. Keep any retrieved source material in a separate unique temporary directory outside Git. Never stage it.
4. Never switch, reset, stage, clean, stash, or edit the caller's checkout. Never use `FETCH_HEAD`, a mutable remote-tracking ref, or another worker's files as publication state.

Retry only recognized Git administrative lock contention after a short bounded delay. Do not reinterpret authentication, network, validation, or merge errors as contention.

## Commit

Validate the entry, stage only that entry, inspect the staged diff, and commit it. One worker commit contains exactly one URL's journal work. Keep a copy of the completed notes-only entry outside the worktree until publication succeeds so it can be reapplied if the remote advances.

For an update, record the entry path and its blob OID at the worker's base commit.

## Optimistic publication

Try at most five times:

1. Fetch the current primary branch into a new unique private ref and resolve its immutable OID.
2. Check the canonical URL in that tree. For a create, return `superseded_by_existing` if another worker published it. For an update, return `update_conflict` if the recorded entry blob changed.
3. If the remote OID is the parent of the local commit, use that commit. Otherwise create a fresh detached worktree at the new OID, install only the completed entry, validate, and create a replacement commit.
4. Push the candidate with an explicit destination using a normal fast-forward push. On a non-fast-forward rejection, retry from step 1. Never force-push, create a merge commit, or overwrite another entry.

If five races or a non-race error prevents publication, preserve the worktree and commit and return `publication_blocked` with their locations.

## Verify and clean up

After a successful push, fetch the primary branch into a new private verification ref. Confirm that its immutable OID contains the published commit and exactly one entry with the canonical URL.

Return a compact manifest with `url`, `status`, `entry_path`, `source_access`, `commit`, `remote_branch`, `remote_verified`, and a short guide or limitation. Valid statuses are `published`, `already_exists`, `superseded_by_existing`, `no_substantive_content`, `update_conflict`, and `publication_blocked`.

After successful verification, remove clean temporary worktrees, source files, completed-entry copies, and private refs. Preserve state for `publication_blocked` or `update_conflict`. Never include source text, full entries, or diffs in the manifest.
