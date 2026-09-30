#!/usr/bin/env python3
"""Fetch a public WeChat article and convert it to Markdown, text, or JSON.

Uses only Python's standard library. WeChat may occasionally require browser
verification; in that case the script exits with a useful error instead of
saving the verification page as an article.
"""

from __future__ import annotations

import argparse
import gzip
import html
import json
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36"
)


class FetchError(RuntimeError):
    """A user-facing article download or parsing error."""


@dataclass
class Article:
    title: str
    account: str
    author: str
    published: str
    source_url: str
    content: str


def _clean_inline(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


class WeChatHTMLParser(HTMLParser):
    """Extract metadata and readable Markdown from WeChat's article DOM."""

    metadata_ids = {"activity-name": "title", "js_name": "account"}
    ignored_tags = {"script", "style", "noscript", "svg"}
    block_tags = {
        "p",
        "div",
        "section",
        "article",
        "header",
        "footer",
        "blockquote",
        "pre",
        "table",
        "tr",
        "ul",
        "ol",
    }

    def __init__(self, include_images: bool = True) -> None:
        super().__init__(convert_charrefs=True)
        self.include_images = include_images
        self.metadata: dict[str, list[str]] = {"title": [], "account": []}
        self._metadata_stack: list[tuple[str, int]] = []
        self._depth = 0
        self._body_depth: int | None = None
        self._ignore_depth = 0
        self._parts: list[str] = []
        self._links: list[str | None] = []

    @property
    def in_body(self) -> bool:
        return self._body_depth is not None and self._depth >= self._body_depth

    def _break(self, count: int = 2) -> None:
        if not self._parts:
            return
        current = "".join(self._parts)
        trailing = len(current) - len(current.rstrip("\n"))
        self._parts.append("\n" * max(0, count - trailing))

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._depth += 1
        attributes = dict(attrs)
        element_id = attributes.get("id")

        if element_id in self.metadata_ids:
            self._metadata_stack.append((self.metadata_ids[element_id], self._depth))

        if element_id == "js_content":
            self._body_depth = self._depth

        if not self.in_body:
            return

        if tag in self.ignored_tags:
            self._ignore_depth += 1
            return
        if self._ignore_depth:
            return

        if tag in self.block_tags:
            self._break(2)
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._break(2)
            self._parts.append("#" * int(tag[1]) + " ")
        elif tag == "br":
            self._break(1)
        elif tag == "li":
            self._break(1)
            self._parts.append("- ")
        elif tag == "a":
            href = attributes.get("href")
            resolved = urljoin("https://mp.weixin.qq.com/", href) if href else None
            self._links.append(resolved)
            if resolved:
                self._parts.append("[")
        elif tag == "img" and self.include_images:
            src = attributes.get("data-src") or attributes.get("src")
            if src:
                alt = _clean_inline(attributes.get("alt") or "image")
                self._break(2)
                self._parts.append(f"![{alt}]({html.unescape(src)})")
                self._break(2)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if self.in_body and tag in self.ignored_tags and self._ignore_depth:
            self._ignore_depth -= 1
        elif self.in_body and not self._ignore_depth:
            if tag == "a" and self._links:
                href = self._links.pop()
                if href:
                    self._parts.append(f"]({href})")
            elif tag in self.block_tags or tag in {
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "li",
            }:
                self._break(2)

        while self._metadata_stack and self._metadata_stack[-1][1] == self._depth:
            self._metadata_stack.pop()
        if self._body_depth == self._depth:
            self._body_depth = None
        self._depth -= 1

    def handle_data(self, data: str) -> None:
        if self._metadata_stack:
            self.metadata[self._metadata_stack[-1][0]].append(data)

        if not self.in_body or self._ignore_depth:
            return
        value = re.sub(r"\s+", " ", data)
        if not value.strip():
            return
        if value.startswith(" ") and self._parts and not self._parts[-1].endswith((" ", "\n")):
            self._parts.append(" ")
        self._parts.append(value.strip())
        if value.endswith(" "):
            self._parts.append(" ")

    def markdown(self) -> str:
        raw = "".join(self._parts)
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in raw.splitlines()]
        result: list[str] = []
        for line in lines:
            if line or (result and result[-1]):
                result.append(line)
        return "\n".join(result).strip()


def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname != "mp.weixin.qq.com":
        raise FetchError("Expected a public WeChat URL on https://mp.weixin.qq.com/.")
    return url


def _fetch_with_curl(url: str, timeout: float) -> tuple[str, str]:
    curl = shutil.which("curl")
    if not curl:
        raise FileNotFoundError("curl is not installed")

    marker = b"\n__WECHAT_FETCH_FINAL_URL__:"
    command = [
        curl,
        "--location",
        "--compressed",
        "--fail",
        "--silent",
        "--show-error",
        "--max-time",
        str(timeout),
        "--user-agent",
        USER_AGENT,
        "--header",
        "Accept-Language: zh-CN,zh;q=0.9,en;q=0.8",
        "--write-out",
        marker.decode() + "%{url_effective}",
        url,
    ]
    completed = subprocess.run(command, capture_output=True, check=False)
    if completed.returncode:
        message = completed.stderr.decode("utf-8", errors="replace").strip()
        raise FetchError(message or f"curl exited with status {completed.returncode}")

    payload, separator, final = completed.stdout.rpartition(marker)
    if not separator:
        raise FetchError("curl returned an unreadable response")
    final_url = final.decode("utf-8", errors="replace").strip()
    if urlparse(final_url).hostname != "mp.weixin.qq.com":
        raise FetchError(f"Unexpected redirect to {final_url}")
    return payload.decode("utf-8", errors="replace"), final_url


def _fetch_with_urllib(url: str, timeout: float) -> tuple[str, str]:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            final_url = response.geturl()
            if urlparse(final_url).hostname != "mp.weixin.qq.com":
                raise FetchError(f"Unexpected redirect to {final_url}")
            payload = response.read()
            if response.headers.get("Content-Encoding", "").lower() == "gzip":
                payload = gzip.decompress(payload)
            charset = response.headers.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace"), final_url
    except HTTPError as exc:
        raise FetchError(f"WeChat returned HTTP {exc.code}: {exc.reason}") from exc
    except URLError as exc:
        raise FetchError(f"Could not reach WeChat: {exc.reason}") from exc
    except TimeoutError as exc:
        raise FetchError(f"WeChat did not respond within {timeout:g} seconds") from exc


def fetch_html(url: str, timeout: float) -> tuple[str, str]:
    """Fetch with curl when available; its TLS behavior works better with WeChat."""
    validated = validate_url(url)
    try:
        return _fetch_with_curl(validated, timeout)
    except FileNotFoundError:
        return _fetch_with_urllib(validated, timeout)


def _js_string(source: str, name: str) -> str:
    match = re.search(rf"\b{re.escape(name)}\s*:\s*'((?:\\.|[^'])*)'", source)
    if not match:
        return ""
    value = match.group(1)
    try:
        return bytes(value, "utf-8").decode("unicode_escape").encode("latin1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value.replace(r"\'", "'").replace(r"\\", "\\")


def parse_article(source: str, source_url: str, include_images: bool = True) -> Article:
    parser = WeChatHTMLParser(include_images=include_images)
    parser.feed(source)

    title = _clean_inline("".join(parser.metadata["title"])) or _clean_inline(
        _js_string(source, "title")
    )
    account = _clean_inline("".join(parser.metadata["account"])) or _clean_inline(
        _js_string(source, "nick_name")
    )
    author = _clean_inline(_js_string(source, "author"))
    published = _clean_inline(_js_string(source, "create_time"))
    content = parser.markdown()

    if not content or not title:
        challenge_markers = (
            "环境异常",
            "访问过于频繁",
            "请完成验证",
            "verify",
            "wappoc_appmsgcaptcha",
        )
        if any(marker.lower() in source.lower() for marker in challenge_markers):
            raise FetchError(
                "WeChat requested browser verification. Wait a while, change networks, "
                "or open the link once in a browser before retrying."
            )
        raise FetchError("The response did not contain a readable WeChat article.")

    return Article(title, account, author, published, source_url, content)


def render_markdown(article: Article) -> str:
    metadata = [f"# {article.title}", ""]
    if article.account:
        metadata.append(f"- Account: {article.account}")
    if article.author:
        metadata.append(f"- Author: {article.author}")
    if article.published:
        metadata.append(f"- Published: {article.published}")
    metadata.append(f"- Source: {article.source_url}")
    metadata.extend(["", article.content, ""])
    return "\n".join(metadata)


def render_text(article: Article) -> str:
    content = re.sub(r"!\[[^]]*]\([^)]*\)", "", article.content)
    content = re.sub(r"\[([^]]+)]\((https?://[^)]+)\)", r"\1 <\2>", content)
    content = re.sub(r"^#{1,6}\s+", "", content, flags=re.MULTILINE)
    parts = [article.title]
    if article.account:
        parts.append(f"Account: {article.account}")
    if article.author:
        parts.append(f"Author: {article.author}")
    if article.published:
        parts.append(f"Published: {article.published}")
    parts.extend([f"Source: {article.source_url}", "", content.strip(), ""])
    return "\n".join(parts)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Fetch a public WeChat article and extract its content."
    )
    parser.add_argument("url", help="WeChat article URL (mp.weixin.qq.com)")
    parser.add_argument("-o", "--output", type=Path, help="output file; defaults to stdout")
    parser.add_argument(
        "-f",
        "--format",
        choices=("markdown", "text", "json"),
        default="markdown",
        help="output format (default: markdown)",
    )
    parser.add_argument(
        "--no-images", action="store_true", help="omit image URLs from extracted content"
    )
    parser.add_argument(
        "--timeout", type=float, default=30.0, help="request timeout in seconds (default: 30)"
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        source, final_url = fetch_html(args.url, args.timeout)
        article = parse_article(source, final_url, include_images=not args.no_images)
        if args.format == "json":
            output = json.dumps(asdict(article), ensure_ascii=False, indent=2) + "\n"
        elif args.format == "text":
            output = render_text(article)
        else:
            output = render_markdown(article)

        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output, encoding="utf-8")
            print(f"Saved: {args.output}", file=sys.stderr)
        else:
            sys.stdout.write(output)
        return 0
    except FetchError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
