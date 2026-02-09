#!/usr/bin/env python3
"""
API para registo de despesas por foto.
POST /api/registar-despesa: foto + centro_custo_codigo → OCR → gravar custos
"""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from utils.taxas_iva import parse_taxa_iva

BASE_PATH = Path(os.getenv("GESTAO_BASE_PATH", "/home/bailan/empresa-gestao/GESTAO_EMPRESA"))
DADOS_PATH = BASE_PATH / "03_CONTABILIDADE_ANALITICA" / "dados"
CUSTOS_LINHAS = DADOS_PATH / "custos_linhas.xlsx"
UPLOADS_PATH = DADOS_PATH / "uploads"
UPLOADS_PATH.mkdir(parents=True, exist_ok=True)

try:
    from fastapi import FastAPI, File, Form, UploadFile, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    print("Instale: pip install fastapi uvicorn python-multipart")
    sys.exit(1)

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    from openpyxl import load_workbook
    from openpyxl.utils import get_column_letter
    XL_AVAILABLE = True
except ImportError:
    XL_AVAILABLE = False

app = FastAPI(title="Registo Despesas")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ocr_image(img_path: Path) -> str:
    if not OCR_AVAILABLE:
        return ""
    try:
        img = Image.open(img_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        return pytesseract.image_to_string(img, lang="por+eng")
    except Exception as e:
        return f"[OCR erro: {e}]"


def _extrair_dados_ocr(texto: str) -> dict:
    """Extrai fornecedor, data, valores e IVA do texto OCR."""
    out = {"supplier": "", "date": "", "net_amount": None, "tax_pct": None, "description": ""}
    lines = [l.strip() for l in texto.splitlines() if l.strip()]
    for i, line in enumerate(lines):
        # Data (dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd)
        m = re.search(r"(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})", line)
        if m and not out["date"]:
            d, mo, y = m.groups()
            out["date"] = f"20{y[-2:]}-{mo.zfill(2)}-{d.zfill(2)}" if len(y) == 2 else f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
        # Valores: Total, IVA
        for p in [r"total[:\s]*(\d+[,.]\d{2})", r"(\d+[,.]\d{2})\s*€", r"iva[:\s]*(\d+[,.]?\d*)%?"]:
            m = re.search(p, line.lower())
            if m:
                v = m.group(1).replace(",", ".")
                try:
                    n = float(v)
                    if "iva" in line.lower() or "%" in line:
                        out["tax_pct"] = parse_taxa_iva(v)
                    elif out["net_amount"] is None and n > 0:
                        out["net_amount"] = n
                except ValueError:
                    pass
    # Primeira linha costuma ser fornecedor
    if lines and not out["supplier"]:
        out["supplier"] = lines[0][:100]
    return out


def _append_custo(centro: str, dados: dict, origem: str = "foto") -> None:
    if not XL_AVAILABLE:
        return
    if not CUSTOS_LINHAS.exists():
        DADOS_PATH.mkdir(parents=True, exist_ok=True)
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
        wb = Workbook()
        ws = wb.active
        ws.title = "custos_linhas"
        headers = ["line_id", "document_id", "document_no", "date", "supplier", "description",
                   "quantity", "unit_price", "net_amount", "tax_pct", "tipo_linha", "centro_custo_codigo"]
        for c, h in enumerate(headers, 1):
            cell = ws.cell(1, c, h)
            cell.fill = PatternFill("solid", fgColor="1F2937")
            cell.font = Font(bold=True, color="FFFFFF")
        wb.save(CUSTOS_LINHAS)
    wb = load_workbook(CUSTOS_LINHAS)
    ws = wb.active
    next_row = ws.max_row + 1
    row_data = {
        "line_id": f"foto_{next_row}",
        "document_id": "",
        "document_no": origem,
        "date": dados.get("date"),
        "supplier": dados.get("supplier"),
        "description": dados.get("description") or f"Registo por {origem}",
        "quantity": 1,
        "unit_price": dados.get("net_amount"),
        "net_amount": dados.get("net_amount"),
        "tax_pct": dados.get("tax_pct"),
        "tipo_linha": "materiais",
        "centro_custo_codigo": centro,
    }
    headers = [c.value for c in ws[1]]
    for col, h in enumerate(headers, 1):
        if h in row_data:
            ws.cell(row=next_row, column=col, value=row_data[h])
    wb.save(CUSTOS_LINHAS)


@app.get("/api/centros-custo")
def listar_centros():
    """Lista centros de custo para o dropdown."""
    path = BASE_PATH / "00_CONFIG" / "centros_custo.xlsx"
    if not path.exists():
        return []
    wb = load_workbook(path, data_only=True)
    ws = wb.active
    idx_cod = next((i for i, c in enumerate(ws[1], 1) if c.value == "centro_custo_codigo"), None)
    idx_nome = next((i for i, c in enumerate(ws[1], 1) if c.value == "centro_custo_nome"), None)
    if not idx_cod:
        return []
    out = []
    for r in range(2, ws.max_row + 1):
        cod = ws.cell(r, idx_cod).value
        nome = ws.cell(r, idx_nome).value if idx_nome else ""
        if cod:
            out.append({"codigo": str(cod), "nome": str(nome or cod)})
    return out


ORCAMENTOS_CABECALHO = BASE_PATH / "02_OBRAS" / "ORCAMENTOS" / "orcamentos_cabecalho.xlsx"


@app.get("/api/orcamentos")
def listar_orcamentos():
    """Lista orçamentos do ficheiro Excel."""
    if not XL_AVAILABLE or not ORCAMENTOS_CABECALHO.exists():
        return []
    try:
        wb = load_workbook(ORCAMENTOS_CABECALHO, data_only=True)
        ws = None
        for name in ["orcamentos", "orcamentos_cabecalho", "cabecalho"]:
            if name in wb.sheetnames:
                ws = wb[name]
                break
        if ws is None:
            ws = wb.active
        headers = [str(c.value or "").strip() for c in ws[1]]
        idx_id = next((i for i, h in enumerate(headers, 1) if "orcamento_id" in h.lower() or h == "orcamento_id"), None)
        idx_obra = next((i for i, h in enumerate(headers, 1) if "nome_obra" in h.lower() or "obra" in h.lower()), None)
        idx_cliente = next((i for i, h in enumerate(headers, 1) if "cliente" in h.lower()), None)
        idx_data = next((i for i, h in enumerate(headers, 1) if "data" in h.lower()), None)
        idx_estado = next((i for i, h in enumerate(headers, 1) if "estado" in h.lower()), None)
        idx_total = next((i for i, h in enumerate(headers, 1) if "total" in h.lower()), None)
        if not idx_id:
            return []
        out = []
        for r in range(2, ws.max_row + 1):
            oid = ws.cell(r, idx_id).value
            if not oid:
                continue
            out.append({
                "orcamento_id": str(oid),
                "nome_obra": str(ws.cell(r, idx_obra).value or "") if idx_obra else "",
                "cliente": str(ws.cell(r, idx_cliente).value or "") if idx_cliente else "",
                "data_orcamento": str(ws.cell(r, idx_data).value or "") if idx_data else "",
                "estado": str(ws.cell(r, idx_estado).value or "") if idx_estado else "",
                "total_previsto": ws.cell(r, idx_total).value if idx_total else None,
            })
        return out
    except Exception:
        return []


@app.post("/api/registar-despesa")
async def registar_despesa(
    centro_custo_codigo: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Recebe foto de fatura/recibo + centro de custo.
    Faz OCR, extrai dados e grava em custos_linhas.
    """
    centro = centro_custo_codigo.strip()
    if not centro:
        raise HTTPException(400, "centro_custo_codigo obrigatório")

    ext = Path(file.filename or "").suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        raise HTTPException(400, "Formato inválido. Use jpg, png ou webp.")

    content = await file.read()
    save_path = UPLOADS_PATH / f"{os.urandom(8).hex()}{ext}"
    save_path.write_bytes(content)

    texto = _ocr_image(save_path)
    dados = _extrair_dados_ocr(texto)
    dados["description"] = dados.get("description") or file.filename or "Foto"

    _append_custo(centro, dados, origem=file.filename or "foto")

    return {
        "ok": True,
        "centro_custo_codigo": centro,
        "ocr_texto": texto[:500] if texto else "(OCR não disponível)",
        "dados_extraidos": dados,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
