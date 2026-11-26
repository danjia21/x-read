# Notes entry format

## Layout and identity

Store entries at `reading-journal/entries/YYYY/YYYY-MM-DD-descriptive-slug.md`, using the local read date. Before retrieval, search all entry frontmatter for the canonical `source_url`. Ignore obvious tracking parameters and URL fragments when matching, but preserve the supplied URL when canonicalization is uncertain.

Each file begins with valid YAML frontmatter:

```yaml
---
format: notes-v1
title: "Readable journal-entry title"
source_title: "Original article title"
source_url: "https://example.com/article"
source_language: en
entry_language: en
published: "2026-01-31"
read_date: "2026-09-28"
authors: ["Author Name"]
topics: ["Existing English topic"]
tags: ["specific-tag"]
---
```

Use `unknown` for an unknown scalar and `[]` for an unknown list. Never guess metadata. Keep `topics` in English so the site taxonomy remains consistent. When access was incomplete, add `source_access: partial` and a precise `access_note`. Use `source_access: full` only when the complete substantive article was retrieved.

## Markdown body

The body contains a reading guide followed by zero or more anchored notes:

```markdown
# Reading guide

Compact original guidance for reading the source.

## The critic is exchanged, not free

<!-- x-read-anchor {"heading":"II: Replacing the Critic with Group Sampling","passage":""} -->

Removing the value model saves parameter and optimizer-state memory, while
group sampling spends rollout compute.

## Normalization can become unstable

<!-- x-read-anchor {"heading":"II: Replacing the Critic with Group Sampling","passage":"GRPO normalizes the advantage by the standard deviation"} -->

When within-group reward variance is tiny, the normalized advantage becomes
sensitive to the numerical stabilizer and reward noise.
```

- `# Reading guide` is required and appears exactly once.
- Each `##` heading is the visible title of one note. Do not use the source heading as a substitute for a useful note title.
- Put exactly one `x-read-anchor` comment immediately after each note heading.
- The comment contains one JSON object with `heading` and `passage` string fields. Use an empty string when a field is unnecessary or unavailable.
- `heading` is the exact source section heading when possible. `passage` is a distinctive fragment used only when the heading is insufficient.
- Use ordinary Markdown for note bodies, including links, code, and equations.
- Link external evidence directly from the note that uses it.

## Copyright and size validation

The entry must contain no archived source paragraphs, source images, copied tables, copied code blocks, or reproduced source equations. Titles and section headings may be retained as metadata or anchors. A short quotation is allowed only when analysis requires its exact wording and must be clearly quoted and attributed.

Placement anchors are identifiers, not excerpts:

- Prefer a heading alone.
- Keep `heading` at or below 200 Unicode characters.
- Keep `passage` at or below 160 Unicode characters and use the shortest distinctive fragment.
- Never combine adjacent source sentences to make an anchor.

Before committing, verify all of the following:

1. `format` is exactly `notes-v1` and required metadata is present.
2. The reading guide and every note are original journal prose.
3. Every note has valid anchor JSON with only `heading` and `passage`.
4. Anchor limits are respected and no source body, media, or extended quotation remains.
5. Every cited URL is intentional and every entry source URL is unique.

The site builds its list, search index, topics, and sorting directly from entry metadata. Do not create or update a hand-maintained catalog.
