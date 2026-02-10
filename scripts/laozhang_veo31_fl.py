#!/usr/bin/env python3
"""
Generate a video via LaoZhang API (Veo 3.1) using "First and Last Frame".

Base URL: https://api.laozhang.ai/v1

Key notes (based on LaoZhang docs + observed behavior):
- Async video tasks are created via POST /v1/videos and polled via GET /v1/videos/{id}.
- For image-to-video / first+last-frame, the async endpoint expects multipart/form-data with one or two
  "input_reference" file parts (even if your inputs are URLs). This script accepts URLs and downloads
  them server-side, then uploads as files.
- GET /v1/videos/{id}/content may return either:
  - raw video bytes (e.g. video/mp4), OR
  - JSON with a temporary download URL.

Usage examples:
  export LAOZHANG_API_KEY="YOUR_KEY_HERE"
  python3 scripts/laozhang_veo31_fl.py \\
    --model veo-3.1-fast-fl \\
    --prompt "Time-lapse of road renovation..." \\
    --start-url "https://example.com/start.jpg" \\
    --end-url "https://example.com/end.jpg" \\
    --out /tmp/veo_fl.mp4

Text-to-video (no frames):
  python3 scripts/laozhang_veo31_fl.py --model veo-3.1-fast --prompt "Cinematic ocean waves" --out /tmp/t2v.mp4

Check key + model availability (no generation):
  python3 scripts/laozhang_veo31_fl.py --check-models
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Iterable, Optional, Tuple

import requests


BASE_URL = "https://api.laozhang.ai/v1"


class LaoZhangError(RuntimeError):
    pass


def _redact(s: str, keep: int = 4) -> str:
    s = s or ""
    if len(s) <= keep:
        return "*" * len(s)
    return "*" * (len(s) - keep) + s[-keep:]


def _preview(text: str, limit: int = 900) -> str:
    t = (text or "").strip()
    if len(t) <= limit:
        return t
    return t[:limit] + " ... (truncated)"


def _guess_ext(content_type: str) -> str:
    ct = (content_type or "").lower()
    if "png" in ct:
        return "png"
    if "webp" in ct:
        return "webp"
    if "jpeg" in ct or "jpg" in ct:
        return "jpg"
    return "bin"


@dataclass
class VideoTask:
    id: str
    status: str
    model: Optional[str] = None
    error: Optional[str] = None


class LaoZhangClient:
    def __init__(self, api_key: str, base_url: str = BASE_URL, timeout_s: int = 30) -> None:
        if not api_key or api_key.strip() in ("YOUR_KEY_HERE", "<YOUR_KEY_HERE>"):
            raise LaoZhangError("Missing API key. Set LAOZHANG_API_KEY or edit the script placeholder.")
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self.sess = requests.Session()
        self.sess.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def _raise(self, resp: requests.Response, what: str) -> None:
        body = ""
        try:
            body = resp.text
        except Exception:
            body = "<unavailable>"
        msg = f"{what}: HTTP {resp.status_code} {resp.reason}"
        if body:
            msg += f"\nBody (preview):\n{_preview(body)}"
        raise LaoZhangError(msg)

    def list_models(self) -> dict:
        url = f"{self.base_url}/models"
        r = self.sess.get(url, timeout=self.timeout_s)
        if not r.ok:
            self._raise(r, "List models failed")
        return r.json()

    def _post_json_first_ok(self, path_candidates: Iterable[str], payload: dict) -> requests.Response:
        last: Optional[requests.Response] = None
        for path in path_candidates:
            url = f"{self.base_url}{path}"
            r = self.sess.post(url, json=payload, timeout=self.timeout_s)
            if r.status_code == 404:
                last = r
                continue
            return r
        assert last is not None
        return last

    def _download_image(self, url: str, idx: int) -> Tuple[str, bytes, str]:
        r = requests.get(url, timeout=self.timeout_s)
        if not r.ok:
            raise LaoZhangError(f"Failed to download image #{idx} from URL: HTTP {r.status_code} {r.reason}")
        ct = r.headers.get("content-type", "application/octet-stream")
        ext = _guess_ext(ct)
        filename = f"frame_{idx}.{ext}"
        return filename, r.content, ct

    def create_video_task(
        self,
        model: str,
        prompt: str,
        image_urls: Optional[Iterable[str]] = None,
        *,
        force_multipart: bool = False,
    ) -> VideoTask:
        model = (model or "").strip()
        prompt = (prompt or "").strip()
        if not model:
            raise LaoZhangError("model is required")
        if not prompt:
            raise LaoZhangError("prompt is required")

        imgs = [u for u in (image_urls or []) if u]
        if len(imgs) > 2:
            imgs = imgs[:2]

        # Text-to-video: JSON body.
        if not imgs:
            r = self._post_json_first_ok(
                path_candidates=("/videos", "/video/generations"),
                payload={"model": model, "prompt": prompt},
            )
            if not r.ok:
                self._raise(r, "Create video task failed")
            j = r.json()
            task_id = str(j.get("id") or j.get("task_id") or j.get("taskId") or "").strip()
            if not task_id:
                raise LaoZhangError(f"Create task: missing id in response: {_preview(json.dumps(j))}")
            return VideoTask(id=task_id, status=str(j.get("status") or "queued"), model=j.get("model"))

        # First/Last frame:
        # 1) Try JSON with image_urls=[start,end] (as some LaoZhang docs describe).
        # 2) Fall back to multipart/form-data with input_reference file parts.
        if not force_multipart:
            r_json = self._post_json_first_ok(
                path_candidates=("/videos", "/video/generations"),
                payload={"model": model, "prompt": prompt, "image_urls": imgs},
            )
            if r_json.ok:
                j = r_json.json()
                task_id = str(j.get("id") or j.get("task_id") or j.get("taskId") or "").strip()
                if not task_id:
                    raise LaoZhangError(f"Create task: missing id in response: {_preview(json.dumps(j))}")
                return VideoTask(id=task_id, status=str(j.get("status") or "queued"), model=j.get("model"))

        # Multipart with one or two input_reference parts.
        files = []
        for i, img_url in enumerate(imgs):
            if not (img_url.startswith("http://") or img_url.startswith("https://")):
                raise LaoZhangError("start-url/end-url must be http(s) URLs for this script")
            fn, data, ct = self._download_image(img_url, i)
            files.append(("input_reference", (fn, data, ct)))

        last_404 = False
        for path in ("/videos", "/video/generations"):
            url = f"{self.base_url}{path}"
            data = {"model": model, "prompt": prompt}
            r = self.sess.post(url, data=data, files=files, timeout=self.timeout_s)
            if r.status_code == 404:
                last_404 = True
                continue
            if not r.ok:
                self._raise(r, "Create video task (multipart) failed")
            j = r.json()
            task_id = str(j.get("id") or j.get("task_id") or j.get("taskId") or "").strip()
            if not task_id:
                raise LaoZhangError(f"Create task: missing id in response: {_preview(json.dumps(j))}")
            return VideoTask(id=task_id, status=str(j.get("status") or "queued"), model=j.get("model"))

        raise LaoZhangError("Create video task failed: no endpoints matched (404)" if last_404 else "Create video task failed")

    def get_video_task(self, task_id: str) -> VideoTask:
        tid = (task_id or "").strip()
        if not tid:
            raise LaoZhangError("task_id is required")
        url = f"{self.base_url}/videos/{requests.utils.quote(tid, safe='')}"
        r = self.sess.get(url, timeout=self.timeout_s)
        if not r.ok:
            self._raise(r, "Get video task failed")
        j = r.json()
        status = str(j.get("status") or "").strip().lower() or "unknown"
        err = j.get("error") or j.get("message")
        if isinstance(err, dict):
            err = err.get("message") or json.dumps(err)
        if err is not None:
            err = str(err)
        return VideoTask(id=str(j.get("id") or tid), status=status, model=j.get("model"), error=err)

    def fetch_video_content(self, task_id: str) -> requests.Response:
        tid = (task_id or "").strip()
        if not tid:
            raise LaoZhangError("task_id is required")
        url = f"{self.base_url}/videos/{requests.utils.quote(tid, safe='')}/content"
        # stream=True to avoid buffering entire MP4 into memory.
        r = self.sess.get(url, timeout=self.timeout_s, stream=True)
        if not r.ok:
            self._raise(r, "Fetch video content failed")
        return r


def poll_until_done(
    client: LaoZhangClient,
    task_id: str,
    timeout_s: int,
    initial_sleep_s: float = 2.0,
    max_sleep_s: float = 10.0,
) -> VideoTask:
    deadline = time.time() + timeout_s
    sleep_s = initial_sleep_s
    while True:
        task = client.get_video_task(task_id)
        if task.status in ("completed", "succeeded", "success"):
            return task
        if task.status in ("failed", "error"):
            raise LaoZhangError(f"Task failed: {task.error or 'unknown error'} (task_id={task_id})")
        if time.time() > deadline:
            raise LaoZhangError(f"Timed out waiting for completion (task_id={task_id}, last_status={task.status})")
        time.sleep(sleep_s)
        sleep_s = min(max_sleep_s, sleep_s * 1.25)


def save_video_from_content_response(resp: requests.Response, out_path: str) -> Optional[str]:
    ct = (resp.headers.get("content-type") or "").lower()
    if "application/json" in ct:
        j = resp.json()
        # docs usually return {"url": "..."} but keep it flexible
        url = j.get("url") or j.get("video_url") or j.get("videoUrl")
        if isinstance(url, str) and url.startswith("http"):
            # return URL for the caller to download
            return url
        raise LaoZhangError(f"Unexpected JSON from /content: {_preview(json.dumps(j))}")

    # Assume video bytes.
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    return None


def download_to(url: str, out_path: str, timeout_s: int = 120) -> None:
    r = requests.get(url, stream=True, timeout=timeout_s)
    if not r.ok:
        raise LaoZhangError(f"Download failed: HTTP {r.status_code} {r.reason}")
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)


def main() -> int:
    ap = argparse.ArgumentParser(description="LaoZhang Veo 3.1 First+Last Frame video generator")
    ap.add_argument("--prompt", default="", help="Text prompt (required unless --check-models)")
    ap.add_argument("--start-url", default="", help="Start frame image URL (optional for t2v)")
    ap.add_argument("--end-url", default="", help="End frame image URL (optional)")
    ap.add_argument(
        "--model",
        default="veo-3.1-fast-fl",
        help='Model id. Use "veo-3.1-fast-fl" or "veo-3.1-landscape-fast-fl" for first+last frame.',
    )
    ap.add_argument("--out", default="", help="Output file path (.mp4) (required unless --check-models)")
    ap.add_argument("--timeout", type=int, default=20 * 60, help="Overall polling timeout in seconds")
    ap.add_argument("--api-key", default="", help="API key override (prefer LAOZHANG_API_KEY env var)")
    ap.add_argument("--debug-models", action="store_true", help="Print whether required models exist (no secrets)")
    ap.add_argument("--check-models", action="store_true", help="Print whether required models exist and exit")
    ap.add_argument(
        "--force-multipart",
        action="store_true",
        help="For image modes, skip JSON image_urls and upload frames as multipart input_reference (more reliable).",
    )

    args = ap.parse_args()

    api_key = (args.api_key or os.getenv("LAOZHANG_API_KEY") or "").strip()
    if not api_key:
        print("ERROR: missing API key. Set LAOZHANG_API_KEY or pass --api-key", file=sys.stderr)
        return 2

    client = LaoZhangClient(api_key=api_key)

    if args.debug_models or args.check_models:
        try:
            models = client.list_models()
            ids = []
            for m in models.get("data", []) if isinstance(models, dict) else []:
                mid = m.get("id") if isinstance(m, dict) else None
                if isinstance(mid, str):
                    ids.append(mid)
            needed = {"veo-3.1-fast-fl", "veo-3.1-landscape-fast-fl"}
            present = sorted(needed.intersection(ids))
            missing = sorted(needed.difference(ids))
            print("Models present:", ", ".join(present) if present else "(none)")
            print("Models missing:", ", ".join(missing) if missing else "(none)")
        except Exception as e:
            print(f"Model check failed: {e}", file=sys.stderr)
            if args.check_models:
                return 3

    if args.check_models:
        return 0

    if not (args.prompt or "").strip():
        print("ERROR: --prompt is required (unless --check-models)", file=sys.stderr)
        return 2
    if not (args.out or "").strip():
        print("ERROR: --out is required (unless --check-models)", file=sys.stderr)
        return 2

    image_urls = [u for u in [args.start_url, args.end_url] if u]
    print(
        "Create task:",
        json.dumps(
            {
                "base_url": BASE_URL,
                "model": args.model,
                "prompt_preview": (args.prompt[:80] + "...") if len(args.prompt) > 80 else args.prompt,
                "frames": len(image_urls),
                "api_key": _redact(api_key),
            },
            ensure_ascii=True,
        ),
        flush=True,
    )

    def run_once(*, force_multipart: bool) -> VideoTask:
        task = client.create_video_task(
            model=args.model,
            prompt=args.prompt,
            image_urls=image_urls,
            force_multipart=force_multipart,
        )
        print(f"Task created: id={task.id} status={task.status}", flush=True)
        task_done = poll_until_done(client, task.id, timeout_s=args.timeout)
        print(f"Task completed: id={task_done.id} status={task_done.status}", flush=True)
        return task_done

    try:
        task_done = run_once(force_multipart=bool(args.force_multipart))
    except LaoZhangError as e:
        msg = str(e)
        # Observed: LaoZhang may accept JSON {image_urls: [...]} but later fail with:
        # "帧转视频模式的至少上传一帧" (must upload at least one frame).
        # In that case, retry once via multipart upload.
        needs_frame_upload = ("至少上传一帧" in msg) or ("at least" in msg.lower() and "frame" in msg.lower())
        if image_urls and (not args.force_multipart) and needs_frame_upload:
            print("Retrying with multipart frame upload (input_reference)...", flush=True)
            task_done = run_once(force_multipart=True)
        else:
            raise

    resp = client.fetch_video_content(task_done.id)
    print(f"Content endpoint (auth required): {BASE_URL}/videos/{task_done.id}/content", flush=True)
    tmp_url = save_video_from_content_response(resp, args.out)
    resp.close()

    if tmp_url:
        print(f"Temporary download URL: {tmp_url}", flush=True)
        print("Content returned JSON url (temporary). Downloading...", flush=True)
        download_to(tmp_url, args.out, timeout_s=300)

    size = os.path.getsize(args.out)
    print(f"Saved: {args.out} ({size} bytes)", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
