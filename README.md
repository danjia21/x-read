# x-read

`x-read` is a personal technical reading archive. It preserves articles in their original language and reading order, then adds clearly identified commentary for background, concept explanations, fact-checking, and evidence boundaries.

The repository also includes a small utility for turning public WeChat articles into readable local files, which makes Chinese-language sources easier to add to the journal.

## Repository layout

- [`reading-journal/`](reading-journal/) contains the annotated articles and their catalog.
- [`reading-journal/catalog.md`](reading-journal/catalog.md) indexes journal entries by topic and reading date.
- [`scripts/`](scripts/) contains supporting tools, including the public WeChat article fetcher.

## Using the journal

Entries are stored under `reading-journal/entries/YYYY/`. To have Codex read, verify, annotate, and catalog an article, use the technical reading journal skill:

> Use $technical-reading-journal to digest this technical article and add it to my reading journal: [URL]

See [`reading-journal/README.md`](reading-journal/README.md) for the journal format and [`scripts/README.md`](scripts/README.md) for WeChat-fetcher usage.
