# Colocar a app online

A aplicação tem duas partes:
1. **Frontend** (gestao-web – Next.js) → Vercel
2. **API** (FastAPI) → Render

## Pré-requisitos

- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [Render](https://render.com) (gratuita)
- Projeto num repositório **Git** (GitHub ou GitLab)

---

## 1. API (Render)

1. Faz push do projeto para o GitHub/GitLab.
2. Entra em [dashboard.render.com](https://dashboard.render.com) e faz login.
3. Clica em **New** → **Web Service**.
4. Liga o teu repositório.
5. Configura:
   - **Name:** gestao-empresa-api
   - **Region:** Frankfurt (ou mais próximo)
   - **Branch:** main
   - **Runtime:** Docker
   - **Dockerfile Path:** `Dockerfile.api` (ou `./Dockerfile.api`)
   - **Instance Type:** Free
6. Em **Environment**, adiciona:
   - `GESTAO_BASE_PATH` = `/app`
7. Clica em **Create Web Service**.
8. Espera o deploy terminar e anota o URL da API (ex.: `https://gestao-empresa-api.onrender.com`).

**Nota:** No plano gratuito, a API adormece após ~15 min sem uso. O primeiro pedido depois disso pode demorar 30–60 segundos.

---

## 2. Frontend – gestao-web (Vercel)

1. Entra em [vercel.com](https://vercel.com) e faz login.
2. Clica em **Add New** → **Project** e importa o repositório.
3. Configura:
   - **Root Directory:** `gestao-web` (clica em **Edit** e indica este caminho)
   - **Framework Preset:** Next.js (deve ser detetado automaticamente)
4. Em **Environment Variables**, adiciona:
   - **Name:** `API_BACKEND_URL`
   - **Value:** URL da API no Render (ex.: `https://gestao-empresa-api.onrender.com`)
   - Marca: Production, Preview, Development
5. Clica em **Deploy**.

O Next.js faz o proxy de `/api` para a API configurada em `API_BACKEND_URL`.

---

## 3. Resultado

- **Frontend:** `https://teu-projeto.vercel.app`
- **API:** `https://gestao-empresa-api.onrender.com`

A app fica online e acessível a partir do telemóvel.

---

## Alternativa: deploy manual

### API (na tua VM/servidor)

```bash
cd GESTAO_EMPRESA
docker build -f Dockerfile.api -t gestao-api .
docker run -p 8000:8000 -e GESTAO_BASE_PATH=/app gestao-api
```

### Frontend gestao-web (Vercel CLI)

```bash
cd gestao-web
API_BACKEND_URL=https://gestao-empresa-api.onrender.com npx vercel --prod
```
