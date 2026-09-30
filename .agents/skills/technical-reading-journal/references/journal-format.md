# Journal format and maintenance

## Directory layout

Maintain this structure at the configured journal root:

```text
reading-journal/
├── README.md
├── catalog.md
└── entries/
    └── YYYY/
        └── YYYY-MM-DD-descriptive-slug.md
```

Use the local read date for the year, date prefix, and `read_date`. Choose a stable descriptive slug. Before creating a file, search existing entry frontmatter for the same canonical `source_url`. Update the existing entry rather than creating a duplicate unless the user explicitly requests another version. Treat obvious tracking-only query parameters and URL fragments as non-canonical, but preserve the supplied URL in the entry when canonicalization is uncertain.

## Entry metadata

Begin every entry with valid YAML frontmatter containing at least:

```yaml
title: "Readable journal-entry title"
source_title: "Original article title"
source_url: "https://example.com/article"
source_language: "en"
entry_language: "en"
published: "2026-01-31"
read_date: "2026-09-28"
authors:
  - "Author Name"
topics:
  - "Existing or well-scoped English topic"
tags:
  - "specific-tag"
```

Quote ambiguous strings. Use `unknown` for an unknown scalar and `[]` for an unknown list; never guess. Use reliably determined language identifiers consistently with the existing journal. `title` may be optimized for the journal; `source_title` preserves the original title.

## Entry content

Use original-text-plus-annotations format for URL-sourced articles. The entry body should contain:

1. YAML source metadata, followed by the source article's own title and complete substantive body in source order and original Markdown formatting.
2. A callout containing a brief reading note when source, access, or evidence limitations need disclosure.
3. A labeled callout immediately after any original passage that benefits from explanation, context, verification, qualification, or criticism.
4. Optional takeaways or open questions in callouts only after the complete annotated original.
5. Direct links to the article and all external references.

Preserve original headings, paragraphs, lists, code, tables, captions, and meaningful image positions without adding blockquote markers or other wrappers. Do not transform the article into a new outline or replace it with an overview, even if a rewrite would be shorter or more coherent. Do not paraphrase source text. Remove only unmistakable webpage chrome and unrelated boilerplate; retain doubtful material.

Use this format for journal-authored material:

```markdown
> [!NOTE]
> **注解｜简短主题**
>
> Explanation, verification, and citations belong here.
```

Use the same callout shape for journal-authored reading notes, summaries, takeaways, open questions, and added section labels. Do not place an added heading outside the block merely to introduce a callout. YAML frontmatter is the sole structural exception because it is machine-readable metadata. The original article itself must not be placed in a callout or blockquote.

Label added interpretation/background and external verification unambiguously inside their callouts. Prefer primary sources. Do not fabricate authors, dates, titles, venues, or URLs.

## README

If absent, create a concise `README.md` explaining the directory structure and showing an invocation such as:

```text
Use $technical-reading-journal to digest this technical article and add it to my reading journal: [URL]
```

Do not make the README a second catalog. Preserve valid existing README content when updating the journal.

## Catalog

Create or update `catalog.md` whenever an entry is added or revised.

- Group entries by meaningful topics chosen in the context of the whole journal. Reuse existing topic names and avoid near-duplicates.
- Keep the catalog interface and taxonomy in English regardless of source language: the catalog title, section headings, topic/category names, labels, and fixed metadata wording must be English. Store `topics` frontmatter values in English so future catalog updates preserve this invariant.
- Entry-specific content may follow the source language: linked entry titles, source or author names, and the one-line description may be Chinese for a Chinese source.
- An entry may appear under multiple relevant topics, but only once within a topic.
- Link to entries with paths relative to `catalog.md`.
- For each link, show the article title, source, reading date, and a concise one-line description.
- Sort entries within each topic in reverse chronological order.
- Maintain an `All entries` section in reverse chronological order, without duplicates.
- Preserve valid manual notes and custom sections. Make the smallest targeted edit that restores the required indexes.

After editing, verify that each catalog link resolves, each updated entry appears under its relevant topics and exactly once in `All entries`, and no unrelated manual content was lost.
