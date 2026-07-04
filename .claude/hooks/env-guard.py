#!/usr/bin/env python3
"""PreToolUse guard para Write/Edit: bloquea la edicion de archivos .env."""
import json
import sys


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    file_path = data.get("tool_input", {}).get("file_path", "")
    name = file_path.rsplit("/", 1)[-1]
    if name == ".env" or name.startswith(".env."):
        sys.stderr.write(f"[HOOK] Edicion de archivos .env bloqueada: {file_path}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
