#!/bin/bash
# 1. Instalar git (se não existir)
# 2. Inicializar repo, commit e push para GitHub

set -e

cd "$(dirname "$0")/.."
REPO_URL="https://github.com/BailaoHugo/https-github.com-hugo_bailao-empresa-gestao.git"

# 1. Instalar git
if ! command -v git >/dev/null 2>&1; then
  echo "A instalar git..."
  sudo apt-get update
  sudo apt-get install -y git
  echo "Git instalado."
else
  echo "Git já está instalado: $(git --version)"
fi

# 2. Inicializar repo (se não existir)
if [ ! -d .git ]; then
  echo "A inicializar repositório git..."
  git init
  git add .
  git commit -m "Sincronizar VM - gestao-web Next.js, cloudbuild, deploy Cloud Run"
  git branch -M main
  git remote add origin "$REPO_URL"
  echo "Repositório inicializado."
else
  echo "Repositório já existe. A adicionar alterações..."
  git add .
  git status
  if git diff --cached --quiet 2>/dev/null; then
    echo "Nenhuma alteração para fazer commit."
  else
    git commit -m "Atualizar - gestao-web, cloudbuild, etc."
  fi
fi

# Garantir branch main e remote (mesmo quando .git já existia)
git branch -M main
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

# 3. Pull rebase (se o remote tiver commits) e push
echo "A fazer pull e push..."
git fetch origin 2>/dev/null || true
if git rev-parse origin/main >/dev/null 2>&1; then
  git pull origin main --rebase --allow-unrelated-histories 2>/dev/null || git pull origin main --allow-unrelated-histories || true
fi
git push -u origin main

echo ""
echo "Concluído. GitHub atualizado."
