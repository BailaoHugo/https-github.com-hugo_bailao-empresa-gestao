#!/usr/bin/env python3
"""
Lê custos_linhas.xlsx e gera um Excel por centro de custo (obra)
com 3 abas: subempreitadas, materiais, mao_obra.
"""
import os
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

BASE_PATH = Path(os.getenv("GESTAO_BASE_PATH", "/home/bailan/empresa-gestao/GESTAO_EMPRESA"))
DADOS_PATH = BASE_PATH / "03_CONTABILIDADE_ANALITICA" / "dados"
OBRAS_PATH = BASE_PATH / "03_CONTABILIDADE_ANALITICA" / "obras"
CUSTOS_LINHAS = DADOS_PATH / "custos_linhas.xlsx"
ALOCACAO_DIARIA = DADOS_PATH / "alocacao_diaria.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="1F2937")
HEADER_FONT = Font(bold=True, color="FFFFFF")

COLUNAS_SUB = ["date", "document_no", "supplier", "description", "quantity", "unit_price", "net_amount", "tax_pct"]
COLUNAS_MAT = COLUNAS_SUB
COLUNAS_MO = ["data", "trabalhador_codigo", "centro_custo_codigo", "horas", "notas"]


def _load_sheet(path: Path) -> list[dict]:
    if not path.exists():
        return []
    wb = load_workbook(path, data_only=True)
    ws = wb.active
    headers = [c.value for c in ws[1]]
    return [
        {h: ws.cell(r, i + 1).value for i, h in enumerate(headers) if h}
        for r in range(2, ws.max_row + 1)
    ]


def _load_custos() -> list[dict]:
    return _load_sheet(CUSTOS_LINHAS)


def _load_alocacao_por_centro() -> dict[str, list[dict]]:
    rows = _load_sheet(ALOCACAO_DIARIA)
    por_centro: dict[str, list[dict]] = {}
    for r in rows:
        cc = str(r.get("centro_custo_codigo") or "").strip()
        if cc:
            if cc not in por_centro:
                por_centro[cc] = []
            por_centro[cc].append(r)
    return por_centro


def _escrever_aba(ws, colunas: list[str], rows: list[dict], nome_aba: str) -> None:
    for col, h in enumerate(colunas, 1):
        c = ws.cell(row=1, column=col, value=h)
        c.fill = HEADER_FILL
        c.font = HEADER_FONT
    for r, row in enumerate(rows, 2):
        for col, h in enumerate(colunas, 1):
            ws.cell(row=r, column=col, value=row.get(h))


def main() -> None:
    rows = _load_custos()
    com_centro = [r for r in rows if (r.get("centro_custo_codigo") or "").strip()]
    if not com_centro:
        print("⚠️ Nenhuma linha com centro_custo_codigo preenchido.")
        print("   Execute importar_custos_compras.py, preencha a coluna centro_custo_codigo e volte a executar.")
        return

    # Agrupar por centro
    por_centro: dict[str, list[dict]] = {}
    for r in com_centro:
        cc = str(r.get("centro_custo_codigo", "")).strip()
        if cc not in por_centro:
            por_centro[cc] = []
        por_centro[cc].append(r)

    aloc_por_centro = _load_alocacao_por_centro()
    OBRAS_PATH.mkdir(parents=True, exist_ok=True)
    for cc, itens in por_centro.items():
        wb = Workbook()
        ws_sub = wb.active
        ws_sub.title = "subempreitadas"
        ws_mat = wb.create_sheet("materiais")
        ws_mo = wb.create_sheet("mao_obra")

        sub = [r for r in itens if (r.get("tipo_linha") or "").strip().lower() == "subempreitada"]
        mat = [r for r in itens if (r.get("tipo_linha") or "").strip().lower() == "materiais"]
        mo = aloc_por_centro.get(cc, [])

        _escrever_aba(ws_sub, COLUNAS_SUB, sub, "subempreitadas")
        _escrever_aba(ws_mat, COLUNAS_MAT, mat, "materiais")
        _escrever_aba(ws_mo, COLUNAS_MO, mo, "mao_obra")

        path = OBRAS_PATH / f"custo_obra_{cc}.xlsx"
        wb.save(path)
        print(f"✅ {path} (sub: {len(sub)}, mat: {len(mat)}, mo: {len(mo)})")
    print(f"\n✅ Export concluído: {len(por_centro)} obra(s)")


if __name__ == "__main__":
    main()
