# x-read

`x-read` is my personal collection of AI-generated reading guides, annotations,
and fact-checks for technical articles. The repository stores links and short
placement anchors instead of copies of the articles. The Chrome extension opens
each article on its publisher's website and places the corresponding notes into
the reading flow.

The notes add background, explain concepts, and examine claims and evidence.
They may contain errors and should not be treated as verified conclusions or as
statements by the original authors.

Collecting or annotating an article does not imply that its author endorses this collection or the AI-generated commentary.

## Source material and copyright

Original articles, illustrations, code, tables, and other third-party material
remain on their publishers' websites and remain subject to their respective
copyrights and licenses. Source titles, attribution, links, and short text
anchors identify where a note belongs. They do not grant permission to reproduce
or redistribute the underlying works.

The repository also includes a small utility for turning public WeChat articles into readable local files, which makes Chinese-language sources easier to add to the journal.

## Repository layout

- [`reading-journal/`](reading-journal/) contains notes-only journal entries.
- [`scripts/`](scripts/) contains supporting tools, including the public WeChat article fetcher.

## Using the journal

Entries are stored under `reading-journal/entries/YYYY/`. Paste an article URL
into a chat opened in this repository to have Codex read, verify, annotate, and
save it automatically. The site derives its list and topic index from entry
metadata. [`AGENTS.md`](AGENTS.md) defines this default and points to the local
skill even when it is absent from the advertised skill list.

You can also invoke the technical reading journal skill explicitly:

> Use $technical-reading-journal to digest this technical article and add it to my reading journal: [URL]

See [`reading-journal/README.md`](reading-journal/README.md) for the journal format and [`scripts/README.md`](scripts/README.md) for WeChat-fetcher usage.

## Browser reader

[`site/`](site/) is a private notes index with GitHub sign-in, note search,
topic filters, and light/dark themes. Access is restricted to the configured
owner. A backend reads the repository using a GitHub App user token and caches
notes in server memory (five minutes by default). See
[`site/README.md`](site/README.md) for GitHub App registration, configuration,
and container deployment.
