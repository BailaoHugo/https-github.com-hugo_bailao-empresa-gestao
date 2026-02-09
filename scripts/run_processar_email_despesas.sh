#!/usr/bin/env bash
# Processa emails de despesas (registardespesa@ennova.pt)
# Requer: config/paths.env, config/secrets/email_despesas.env
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

set -a
source config/paths.env
[ -f config/secrets/email_despesas.env ] && source config/secrets/email_despesas.env
set +a

python3 app/python/custos/processar_email_despesas.py
