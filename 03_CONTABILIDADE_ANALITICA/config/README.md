# Configuração - Registo de Custos

## classificacao_fornecedores.csv
Mapeamento fornecedor → tipo (materiais | subempreitada).
O nome do fornecedor é comparado em modo parcial (contains, case-insensitive).
Adicione um nome por linha. Ex: "Leroy Merlin" classifica qualquer fornecedor que contenha "leroy merlin".

## classificacao_keywords.csv
Palavras-chave na descrição da linha → tipo.
Use para classificar quando o fornecedor não estiver mapeado.
Ex: "areia" na descrição → materiais.

## Regras de fallback (automáticas)
- IVA 0% (autoliquidação) → tendência subempreitada
- IVA 23% → tendência materiais
