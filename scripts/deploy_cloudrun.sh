#!/bin/bash
# Deploy da API para Google Cloud Run
# Requer: gcloud CLI, projeto GCP com Artifact Registry e Cloud Run ativados

set -e

cd "$(dirname "$0")/.."
PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null)}

if [ -z "$PROJECT_ID" ]; then
  echo "Uso: $0 [PROJECT_ID]"
  echo "Ou define o projeto: gcloud config set project TEU_PROJECT_ID"
  exit 1
fi

echo "Projeto: $PROJECT_ID"

# Ativar APIs necessárias
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com --project="$PROJECT_ID"

# Criar repositório Artifact Registry (se não existir)
gcloud artifacts repositories describe gestao-api --location=europe-west1 --project="$PROJECT_ID" 2>/dev/null || \
  gcloud artifacts repositories create gestao-api --repository-format=docker --location=europe-west1 --project="$PROJECT_ID"

# Build e deploy com Cloud Build
echo "A construir e fazer deploy..."
gcloud builds submit --config=cloudbuild.yaml --project="$PROJECT_ID" .

echo ""
echo "Deploy concluído. URL da API:"
gcloud run services describe gestao-api --region=europe-west1 --project="$PROJECT_ID" --format='value(status.url)'
