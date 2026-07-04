#!/usr/bin/env python3
"""PreToolUse guard para Bash: bloquea comandos peligrosos (exit 2 = bloquear)."""
import json
import re
import sys

DANGEROUS = [
    r"rm\s+-(rf|fr|r\s+-f)\s+[/~]",   # borrado recursivo de raiz/home
    r"curl[^|]*\|\s*(ba|z)?sh",        # pipe de descarga a shell
    r"wget[^|]*\|\s*(ba|z)?sh",
    r"\bsudo\b",
    r"chmod\s+777",
    r"\bssh\b",
    r">\s*/dev/",
    r"migrate\s+reset",
    r"force-reset",
    r"cat\s+\S*\.env",
]


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    command = data.get("tool_input", {}).get("command", "")
    for pattern in DANGEROUS:
        if re.search(pattern, command):
            sys.stderr.write(
                f"[HOOK] Comando bloqueado por politica de seguridad MEA "
                f"(patron: {pattern}): {command[:120]}"
            )
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
