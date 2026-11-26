# WeChat article fetcher

Fetch a public WeChat article and save its readable content as Markdown:

```bash
python3 scripts/fetch_wechat.py \
  'https://mp.weixin.qq.com/s/oCKSxnxtuXbQBMIPAr_cwQ' \
  -o article.md
```

Text and JSON output are also available:

```bash
python3 scripts/fetch_wechat.py URL --format text -o article.txt
python3 scripts/fetch_wechat.py URL --format json -o article.json
```

The script has no third-party Python dependencies. It prefers the system
`curl` command (included with macOS and most Linux distributions) because
WeChat is less likely to challenge its connection, then falls back to Python's
built-in HTTP client. It extracts the title, account, author, publication time,
article text, links, and lazy-loaded image URLs. It preserves equations stored in
`data-formula` attributes as TeX math and retains HTML superscripts/subscripts.
Equation images without TeX remain images; the fetcher does not infer formulas. Use `--no-images` for
text-focused Markdown.

WeChat sometimes returns a verification page instead of an article. The script
detects that response and exits with an explanation; retry later or after
opening the link normally in a browser.

Run extractor regression tests with:

```bash
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Check saved entries for malformed or flattened math with
`npm --prefix site run check:math` (after installing the site's dependencies).
The journal equation workflow runs these checks on changes to entries and the
extractor. It does not deploy the reader. The checker cannot detect equations
that are entirely absent; compare equation locations against the source too.
