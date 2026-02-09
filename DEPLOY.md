# Deploy – Gestão Empresa Online

A aplicação tem duas partes que devem ser configuradas **nesta ordem**:

1. **API** (FastAPI) → Render  
2. **Frontend** (Next.js gestao-web) → Vercel  

---

## Pré-requisitos

- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [Render](https://render.com) (gratuita)
- Repositório no **GitHub** com o projeto

---

## Passo 1: Push para o GitHub

```bash
cd /home/bailan/empresa-gestao
git init
git add .
git commit -m "Deploy: API + Frontend"
git branch -M main
git remote add origin https://github.com/TEU_USER/TEU_REPO.git
git push -u origin main
```

*(Substitui `TEU_USER` e `TEU_REPO` pelos teus dados)*

---

## Passo 2: API no Render

1. Entra em [dashboard.render.com](https://dashboard.render.com) e faz login.
2. **New** → **Web Service**.
3. Liga o teu repositório do GitHub.
4. Configura:
   - **Name:** `gestao-empresa-api`
   - **Region:** Frankfurt (ou mais próximo)
   - **Branch:** `main`
   - **Root Directory:** (deixa vazio se o repo é `GESTAO_EMPRESA`, ou `GESTAO_EMPRESA` se o repo é `empresa-gestao`)
   - **Runtime:** Docker
   - **Dockerfile Path:** `Dockerfile.api` ou `GESTAO_EMPRESA/Dockerfile.api` (conforme a raiz do repo)
5. Em **Environment**:
   - `GESTAO_BASE_PATH` = `/app`
6. **Create Web Service**.
7. Aguarda o deploy terminar e copia o URL (ex.: `https://gestao-empresa-api.onrender.com`).

**Nota:** No plano gratuito a API adormece após ~15 min sem uso. O primeiro pedido pode demorar 30–60 s.

---

## Passo 3: Frontend no Vercel

1. Entra em [vercel.com](https://vercel.com) e faz login.
2. **Add New** → **Project** e importa o repositório.
3. Configura:
   - **Root Directory:** `GESTAO_EMPRESA/gestao-web` ou `gestao-web` (conforme a estrutura do repo)
   - **Framework Preset:** Next.js (detetado automaticamente)
4. Em **Environment Variables**:
   - **Name:** `API_BACKEND_URL`
   - **Value:** URL da API no Render (ex.: `https://gestao-empresa-api.onrender.com`)
   - Marca: **Production**, **Preview**, **Development**
5. **Deploy**.

O Next.js faz proxy de `/api/*` para a URL configurada em `API_BACKEND_URL`.

---

## Resultado

- **Frontend:** `https://teu-projeto.vercel.app`
- **API:** `https://gestao-empresa-api.onrender.com`

Dashboard, Base de Dados, Registo de Custos e Controlo de Custos passam a funcionar online.

---

## Checklist rápido

- [ ] Push para o GitHub
- [ ] Render: Web Service com Docker, `GESTAO_BASE_PATH=/app`
- [ ] Guardar URL da API (ex.: `https://gestao-empresa-api.onrender.com`)
- [ ] Vercel: Root Directory = `GESTAO_EMPRESA/gestao-web`
- [ ] Vercel: `API_BACKEND_URL` = URL da API do Render
- [ ] Deploy no Vercel

---

## Estrutura do repositório

Se o repositório for `empresa-gestao` (raiz) com `GESTAO_EMPRESA` dentro:

```
empresa-gestao/
├── GESTAO_EMPRESA/
│   ├── Dockerfile.api
│   ├── gestao-web/
│   ├── app/
│   ├── 00_CONFIG/
│   ├── 01_EMPRESA/
│   └── ...
```

- **Render Root Directory:** `GESTAO_EMPRESA`  
- **Render Dockerfile Path:** `Dockerfile.api`  
- **Vercel Root Directory:** `GESTAO_EMPRESA/gestao-web`
