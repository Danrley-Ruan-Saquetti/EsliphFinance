#!/usr/bin/env python3
"""PreToolUse (Edit|Write): bloqueia editar/sobrescrever uma migration SQL
já existente em server/src/infra/database/drizzle/migrations/.

Regra de origem: docs/architecture/persistence.md — "nunca editar SQL já
aplicado — o Drizzle Kit mantém migrations/meta/_journal.json e snapshots
por versão, e mexer no passado desalinha os dois". Criar uma migration nova
continua permitido; o bloqueio é só para arquivo que já existe no disco.
"""

import json
import os
import re
import sys

MIGRATION_SQL = re.compile(r"server/src/infra/database/drizzle/migrations/[^/]+\.sql$")


def main() -> int:
    payload = json.load(sys.stdin)
    tool_input = payload.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not MIGRATION_SQL.search(file_path.replace("\\", "/")):
        return 0

    if not os.path.isfile(file_path):
        return 0

    reason = (
        "Bloqueado pelo hook block-migration-edit: "
        f"`{os.path.basename(file_path)}` já foi aplicada e mexer nela desalinha "
        "migrations/meta/_journal.json com os snapshots do Drizzle Kit "
        "(docs/architecture/persistence.md). Para mudar o schema, edite os arquivos "
        "em drizzle/schemas/ e gere uma migration nova (`make db-generate NAME=<nome>`)."
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
