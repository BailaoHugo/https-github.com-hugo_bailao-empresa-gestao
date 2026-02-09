# Registo de Custos

## App de foto (prioridade)

1. Iniciar API: `./scripts/run_api.sh` (porta 8000)
2. Iniciar app: `cd app/web/custos-web && npm run dev` (porta 5174)
3. Abrir http://localhost:5174 – escolher centro de custo, tirar/enviar foto, enviar

## Registo por email (registardespesa@ennova.pt)

Envie um email para **registardespesa@ennova.pt** com:
- **Assunto:** centro de custo (ex: `25.113`, `25.113 - CCG`, `24.54`)
- **Anexo:** foto ou PDF da fatura/recibo

O script extrai **toda a informação** da factura (fornecedor, cliente, documento, linhas, totais) e grava em:
- `dados/facturas_extraidas/` — ficheiro `.json` e `.xlsx` por factura (bem organizado)
- Opcional: `custos_linhas.xlsx` se `APPEND_CUSTOS=1` no env

**Configuração:**
1. Criar `config/secrets/email_despesas.env` (copiar de `email_despesas.env.example`)
2. Preencher `EMAIL_PASSWORD` com a password da conta

**Execução manual:**
```bash
./scripts/run_processar_email_despesas.sh
```

**Cron (cada 15 min):**
```bash
*/15 * * * * /home/bailan/empresa-gestao/GESTAO_EMPRESA/scripts/run_processar_email_despesas.sh >> /tmp/email_despesas.log 2>&1
```

## Fluxo completo

1. **Registo por foto** – app custos-web: foto + centro de custo → OCR → custos_linhas
2. **Registo por email** – enviar fatura para registardespesa@ennova.pt (assunto = centro de custo)
3. **Importar compras** – classifica linhas (materiais/subempreitada) e gera `dados/custos_linhas.xlsx`
4. **Preencher centro de custo** – em `custos_linhas.xlsx`, coluna `centro_custo_codigo`
5. **Registar mão de obra** – em `dados/alocacao_diaria.xlsx` (data, trabalhador_codigo, centro_custo_codigo, horas)
6. **Exportar por obra** – gera um Excel por centro de custo em `obras/`

## Controlo de Custos

1. **Alimentar registo unificado** — une custos_linhas + facturas_extraidas + alocacao_diaria:
   ```bash
   ./scripts/run_toc.sh app/python/custos/alimentar_custos_registo.py
   ```
2. **Exportar por obra** — gera Excel com 5 abas (subempreitadas, materiais, mao_obra, equipamentos_maquinaria, custos_sede):
   ```bash
   ./scripts/run_toc.sh app/python/custos/exportar_custos_por_obra.py
   ```
3. **Capítulos orçamento** — gera lista de capítulos a partir do catálogo:
   ```bash
   ./scripts/run_toc.sh app/python/custos/criar_capitulos_orcamento.py
   ```

Preencha `capitulo_orcamento` em `custos_registo.xlsx` para associar custos aos capítulos do orçamento.

## Comandos

```bash
# Com variáveis de ambiente
~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/importar_custos_compras.py

~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/alimentar_custos_registo.py

~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/exportar_custos_por_obra.py

~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh \
  ~/empresa-gestao/GESTAO_EMPRESA/app/python/custos/criar_modulo_trabalhadores.py

# Processar emails de despesas
~/empresa-gestao/GESTAO_EMPRESA/scripts/run_processar_email_despesas.sh

# Migrar centros antigos (001, 054...) para formato YY.NNN
~/empresa-gestao/GESTAO_EMPRESA/scripts/run_toc.sh app/python/custos/migrar_centros_antigos.py
```

## Config

- `config/classificacao_fornecedores.csv` – fornecedor → materiais | subempreitada
- `config/classificacao_keywords.csv` – palavra na descrição → materiais | subempreitada

## Ficheiros de dados

- `dados/custos_linhas.xlsx` – linhas de compras + classificação + centro de custo
- `dados/trabalhadores.xlsx` – lista de trabalhadores (toconline + externos)
- `dados/alocacao_diaria.xlsx` – alocação diária trabalhador → centro de custo
- `obras/custo_obra_XXX.xlsx` – um Excel por obra (abas: subempreitadas, materiais, mao_obra)
