# Orcamentos Web

Mini-aplicacao local para criar orcamentos com workflow:
Capitulos -> Subcapitulos -> Artigos, com PDF via impressao.

## Como usar
```bash
npm install
npm run dev
```

Abre o link que o Vite mostrar no terminal.

## Home / Dashboard
- A aplicacao abre sempre na Home.
- O Modulo 1 e **Orcamentos**.
- Modulos previstos (em desenvolvimento): Gestao de Obras, Registo de Custos, Planeamento, Faturacao.

## Como usar (6 passos)
1) Preenche **Dados do orcamento** no passo 1 do wizard.
2) Escolhe o **Tipo de obra** (Reabilitacao ou Obra nova) – o catalogo e filtrado automaticamente.
3) Usa a **Pesquisa global** para encontrar artigos rapidamente e clicar em **Adicionar**.
4) No passo 2, expande **Areas** e **Capitulos** para navegar na arvore (ja com preview visivel).
5) No passo 3, seleciona **Artigos** (checkbox) e edita no **painel lateral**, acompanhando a **Pre-visualizacao** em tempo real.
6) No passo 4, ajusta **Precos & PDF** e exporta o PDF.

## Dados
- O catalogo inicial vem de `public/catalogo.json`.
- O catalogo e os orcamentos ficam guardados em `localStorage`.
- Os artigos base ficam em `catalogo.json` na chave `items`.
- Se ja tinhas catalogo antigo sem artigos, limpa o `localStorage` para carregar o novo base.

## Arvore compacta
- Areas (A-E) colapsaveis com capitulos dentro.
- Subcapitulos aparecem apenas quando o capitulo esta expandido.
- Artigos aparecem apenas quando o subcapitulo esta expandido.
- Clique no nome expande/colapsa; apenas artigos tem checkbox de selecao.

## Painel lateral
- Ao clicar num artigo, edita: Qtd, PU Seco e (opcional) K Artigo.
- Mostra K efetivo e origem (artigo/capitulo/area/global).
- Para subcapitulos: **+ Adicionar artigo** com geracao automatica de ID.

## Pre-visualizacao
- Mostra o documento em tempo real (capitulos, subcapitulos e artigos).
- Atualiza com Qtd, PU e K, e reflete o modo Seco/Venda.
- Esta visivel ja no passo **2. Selecionar capitulos**, mostrando pelo menos o cabecalho do orcamento.

## K (margem)
- Prioridade: K artigo > K capitulo > K area > K global.
- Campo K vazio significa "usar nivel acima".
- Defaults editaveis:
  - Global: 1.30
  - Area A: 1.40
  - Area B: 1.25
  - Area C: 1.30
  - Area D: 1.25
  - Area E: 1.15

## Obras (codigo AA.NNN)
- Codigo da obra: `AA.NNN` (AA = ano inicio com 2 digitos, NNN = sequencial).
- Exemplo: `25.001 - Remodelacao Loja X`.
- Ao criar nova obra, o sistema sugere o proximo NNN por ano.
- O codigo e unico e validado por regex: `^\\d{2}\\.\\d{3}$`.

### Ligacao Orcamento -> Obra
- **Obra e obrigatoria** no orcamento (campo marcado com *).
- No passo 1 (Dados do orcamento):
  - Dropdown para selecionar obra existente (mostra `AA.NNN - Nome`).
  - Botao "Nova Obra" para criar obra sem sair do modulo.
  - Ao selecionar obra, preenche automaticamente: `ObraCodigo`, `ObraNome`, `ObraDisplay`.
- O `ObraDisplay` aparece no topo do orcamento e no PDF.
- A chave de ligacao entre Orcamentos e Registo de Custos e o `ObraCodigo`:
  - `Orcamento.ObraCodigo = Custos_Movimentos.ObraCodigo`
- Retrocompatibilidade: orcamentos antigos sem `ObraCodigo` sao migrados automaticamente ao abrir.

## Tipo de obra (Reabilitacao vs Obra nova)
- Campo obrigatorio no passo 1: **Tipo de obra**:
  - `reabilitacao`
  - `obra_nova`
- O catalogo (capitulos, subcapitulos e artigos) e filtrado pelo campo `aplicaA` em:
  - `capitulos[]`, `subcapitulos[]`, `items[]`
- Regras:
  - Se um item NAO tiver `aplicaA`, assume-se que aplica a ambos os tipos de obra.
  - A **pesquisa global** respeita sempre o tipo de obra selecionado.
- Se ja existirem artigos selecionados e alterar o tipo de obra:
  - A aplicacao mostra um modal com duas opcoes:
    - **Manter selecao atual** (mesmo que alguns itens possam ficar ocultos)
    - **Limpar selecao e aplicar filtro novo**

## PDF
- **Imprimir / Guardar PDF – Precos Secos**: mostra PU Seco e Total.
- **Imprimir / Guardar PDF – Precos de Venda**: mostra PU Venda e Total Venda.
- Nunca mostra valores de K ao cliente.
