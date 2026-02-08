# Orçamentos + Registo de Custos (Next.js React)

Aplicação de gestão empresarial em Next.js com React.

## Estrutura

- **/** – Dashboard com módulos (Orçamentos, Registo de Custos, etc.)
- **/custos** – Registo de despesas por foto (com Cropper.js)
- **/orcamentos** – Módulo Orçamentos (em migração)

## Desenvolvimento

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

- `NEXT_PUBLIC_API_URL` – URL da API (vazia = usa `/api` com proxy)
- `API_BACKEND_URL` – Backend para proxy `/api` (default: http://localhost:8000)

## Build

```bash
npm run build
npm start
```
