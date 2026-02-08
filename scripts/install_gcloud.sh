#!/bin/bash
# Instalar Google Cloud SDK na VM
# Método 1: apt (requer sudo)
# Método 2: curl (não requer sudo)

set -e

if command -v gcloud >/dev/null 2>&1; then
  echo "gcloud já está instalado: $(gcloud --version | head -1)"
  exit 0
fi

# Tentar apt primeiro (Debian/Ubuntu)
if command -v apt-get >/dev/null 2>&1; then
  echo "A instalar via apt..."
  sudo apt-get update -qq
  sudo apt-get install -y apt-transport-https ca-certificates gnupg curl
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
  curl -sSf https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  sudo apt-get update -qq && sudo apt-get install -y google-cloud-cli
  echo "Instalação concluída. Corre: gcloud init"
  exit 0
fi

# Fallback: curl install
INSTALL_DIR="${HOME}/google-cloud-sdk"
echo "A descarregar e instalar Google Cloud SDK em ${INSTALL_DIR}..."
curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir="${INSTALL_DIR}"
export PATH="${INSTALL_DIR}/bin:$PATH"
echo "export PATH=\"${INSTALL_DIR}/bin:\$PATH\"" >> ~/.bashrc
echo "Instalação concluída. Corre: source ~/.bashrc && gcloud init"
