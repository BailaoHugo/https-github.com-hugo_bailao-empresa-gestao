# Registo de Custos

## App de foto (prioridade)

1. Iniciar API: `./scripts/run_api.sh` (porta 8000)
2. Iniciar app: `cd app/web/custos-web && npm run dev` (porta 5174)
3. Abrir http://localhost:5174 – escolher centro de custo, tirar/enviar foto, enviar

## Fluxo completo

1. **Registo por foto** – app custos-web: foto + centro de custo → OCR → custos_linhas
2. **Importar compras** – classifica linhas (materiais/subempreitada) e gera `dados/custos_linhas.xlsx`
2. **Preencher centro de custo** – em `custos_linhas.xlsx`, coluna `centro_custo_codigo`
3. **Registar mão de obra** – em `dados/alocacao_diaria.xlsx` (data, trabalhador_codigo, centro_custo_codigo, horas)
4. **Exportar por obra** – gera um Excel por centro de custo em `obras/`

## Comandos

```bash
# Com variáveis de ambiente
~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/importar_custos_compras.py

~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/exportar_custos_por_obra.py

~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/criar_modulo_trabalhadores.py
```

## Config

- `config/classificacao_fornecedores.csv` – fornecedor → materiais | subempreitada
- `config/classificacao_keywords.csv` – palavra na descrição → materiais | subempreitada

## Ficheiros de dados

- `dados/custos_linhas.xlsx` – linhas de compras + classificação + centro de custo
- `dados/trabalhadores.xlsx` – lista de trabalhadores (toconline + externos)
- `dados/alocacao_diaria.xlsx` – alocação diária trabalhador → centro de custo
- `obras/custo_obra_XXX.xlsx` – um Excel por obra (abas: subempreitadas, materiais, mao_obra)
