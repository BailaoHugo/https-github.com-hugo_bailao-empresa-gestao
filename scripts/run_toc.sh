#!/usr/bin/env bash
set -euo pipefail

# Carregar variáveis de ambiente
set -a
source "$(dirname "$0")/../config/paths.env"
# Carregar credenciais OAuth (se existir)
[ -f "$(dirname "$0")/../config/secrets/toconline_oauth.env" ] && \
    source "$(dirname "$0")/../config/secrets/toconline_oauth.env"
set +a

# Executar script Python passado como argumento
python3 "$@"
