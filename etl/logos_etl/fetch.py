"""Download a source's files into data/raw/<key>/ and checksum them."""
import hashlib
import os
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

from .db import REPO_ROOT
from .sources import SOURCES

RAW = REPO_ROOT / "data" / "raw"


def _ssl_context() -> ssl.SSLContext:
    bundle = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    return ssl.create_default_context(cafile=bundle) if bundle else ssl.create_default_context()


def ensure(key: str) -> tuple[list[Path], str]:
    """Return local paths (in source order) and a combined sha256 of their contents."""
    target = RAW / key
    target.mkdir(parents=True, exist_ok=True)
    combined = hashlib.sha256()
    paths: list[Path] = []
    for url in SOURCES[key].files:
        name = urllib.parse.unquote(url.rsplit("/", 1)[1])
        path = target / name
        if not path.exists():
            quoted = urllib.parse.quote(url, safe=":/")
            with urllib.request.urlopen(quoted, context=_ssl_context(), timeout=300) as r:
                data = r.read()
            path.write_bytes(data)
        combined.update(path.read_bytes())
        paths.append(path)
    return paths, combined.hexdigest()


def ensure_git(key: str) -> tuple[Path, str]:
    """Shallow-fetch a pinned commit of a git repository into data/raw/<key>/."""
    import subprocess

    src = SOURCES[key]
    repo = src.notes.removeprefix("git:")
    target = RAW / key
    if not (target / ".git").exists():
        target.mkdir(parents=True, exist_ok=True)
        run = lambda *a: subprocess.run(["git", "-C", str(target), *a], check=True, capture_output=True)  # noqa: E731
        run("init", "-q")
        run("remote", "add", "origin", repo)
        run("fetch", "-q", "--depth", "1", "origin", src.version)
        run("checkout", "-q", "FETCH_HEAD")
    return target, src.version
