#!/usr/bin/env python3
"""PreToolUse (Bash): bloqueia npm/npx/node/docker compose/psql direto no host
quando o comando ou o cwd apontam para server/.

Regra de origem: server/CLAUDE.md ("Nunca rodar npm/node/npx direto na
máquina host") e a skill stack-runner ("nada de npm, node, npx, docker
compose ou psql na máquina host: todo comando roda dentro do container
workspace, invocado por um alvo do Makefile").
"""

import json
import re
import sys

FORBIDDEN = re.compile(r"(?<![\w.-])(npm|npx|node|psql|docker[ \t]+compose|docker-compose)(?![\w.-])")
SERVER_CONTEXT = re.compile(r"(^|[/ \t\"'])server([/ \t\"'.]|$)")


def main() -> int:
    payload = json.load(sys.stdin)
    tool_input = payload.get("tool_input", {})
    command = tool_input.get("command", "")
    cwd = payload.get("cwd", "")

    if not FORBIDDEN.search(command):
        return 0

    targets_server = bool(SERVER_CONTEXT.search(command)) or cwd.rstrip("/").endswith("/server") or "/server/" in cwd

    if not targets_server:
        return 0

    match = FORBIDDEN.search(command).group(0)
    reason = (
        f"Bloqueado pelo hook block-host-server-commands: `{match}` não roda direto no host para o server/. "
        "Use um alvo do Makefile (`make -C server <alvo>`, ex.: make dev, make test, make db-cli) — "
        "veja `make -C server help` ou a skill stack-runner."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
