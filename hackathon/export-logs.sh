#!/usr/bin/env bash
# Bundle this project's Claude Code session transcripts into the repo so they can be
# linked from the hackathon submission. Re-run before submitting to capture new threads.
set -euo pipefail
SRC="$HOME/.claude/projects/-Users-lindaawad-VoidpetInc-MotionDirector"
DEST="$(cd "$(dirname "$0")" && pwd)/session-logs"
mkdir -p "$DEST"
count=0
for f in "$SRC"/*.jsonl; do
  [ -e "$f" ] || continue
  cp "$f" "$DEST/"
  count=$((count + 1))
done
echo "Exported $count transcript(s) to $DEST"
