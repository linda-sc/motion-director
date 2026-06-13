#!/usr/bin/env python3
"""Convert exported Claude Code .jsonl session transcripts into readable Markdown
capability logs for the hackathon submission.

Usage: python3 hackathon/export-session-md.py <session.jsonl> <out.md> ["Header note"]

This is a faithful flattening: user/assistant text, tool calls (compacted),
truncated tool results, and image placeholders. Thinking blocks are dropped
(they are empty/redacted in the export).
"""
import json, sys, os

MAXLEN = 600

def truncate(s, n=MAXLEN):
    s = s.replace("\r", "")
    return s if len(s) <= n else s[:n].rstrip() + " …[truncated]"

def block_text(b):
    """Render a single content block to markdown, or None to skip."""
    t = b.get("type")
    if t == "text":
        txt = b.get("text", "").strip()
        return txt or None
    if t == "thinking":
        return None  # redacted/empty in export
    if t == "image":
        return "_[image]_"
    if t == "tool_use":
        name = b.get("name", "tool")
        inp = b.get("input", {})
        hint = inp.get("description") or inp.get("command") or inp.get("file_path") or inp.get("pattern") or ""
        hint = truncate(str(hint), 160)
        return f"> 🔧 **{name}** — {hint}" if hint else f"> 🔧 **{name}**"
    if t == "tool_result":
        c = b.get("content")
        if isinstance(c, list):
            parts = []
            for sub in c:
                if isinstance(sub, dict):
                    if sub.get("type") == "image":
                        parts.append("_[image]_")
                    elif sub.get("type") == "text":
                        parts.append(sub.get("text", ""))
                else:
                    parts.append(str(sub))
            c = "\n".join(parts)
        return f"> ↳ _result:_ {truncate(str(c), 400)}"
    return None

def render(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        out = []
        for b in content:
            if isinstance(b, dict):
                r = block_text(b)
                if r:
                    out.append(r)
        return "\n\n".join(out)
    return ""

def main():
    src, out = sys.argv[1], sys.argv[2]
    note = sys.argv[3] if len(sys.argv) > 3 else ""
    records = []
    with open(src) as fh:
        for line in fh:
            line = line.strip()
            if line:
                records.append(json.loads(line))

    title = None; custom = None; model = None
    first_ts = last_ts = None; nuser = nasst = 0
    for d in records:
        t = d.get("type")
        if t == "ai-title": title = d.get("aiTitle")
        if t == "custom-title": custom = d.get("customTitle")
        if t in ("user", "assistant"):
            ts = d.get("timestamp")
            if ts:
                first_ts = first_ts or ts; last_ts = ts
            if t == "user": nuser += 1
            else:
                nasst += 1
                model = model or d.get("message", {}).get("model")

    lines = []
    lines.append(f"# {title or custom or os.path.basename(src)}")
    lines.append("")
    if note:
        lines.append(f"> {note}")
        lines.append("")
    lines.append(f"**Session:** `{records[0].get('sessionId','?') if records else '?'}`  ")
    lines.append(f"**Model:** {model or 'n/a'}  ")
    lines.append(f"**Window:** {first_ts} → {last_ts}  ")
    lines.append(f"**Turns:** {nuser} user · {nasst} assistant")
    lines.append("")
    lines.append("---")
    lines.append("")

    for d in records:
        t = d.get("type")
        if t == "user":
            body = render(d.get("message", {}).get("content"))
            if body.strip():
                # tool-result-only user turns get a lighter heading
                if body.lstrip().startswith("> ↳"):
                    lines.append(body); lines.append("")
                else:
                    lines.append(f"### 🧑 User"); lines.append(""); lines.append(body); lines.append("")
        elif t == "assistant":
            body = render(d.get("message", {}).get("content"))
            if body.strip():
                lines.append(f"### 🤖 Claude"); lines.append(""); lines.append(body); lines.append("")

    with open(out, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"Wrote {out} ({nuser}u/{nasst}a turns)")

if __name__ == "__main__":
    main()
