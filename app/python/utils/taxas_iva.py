#!/usr/bin/env python3
"""
Parser de taxas IVA a partir de texto extraído (OCR, e-mail, etc.).
Aceita: "23%", "13%", "6%", "isento", "IVA 23%", "Taxa normal", etc.
"""
import re
from typing import Optional


# Mapeamento de termos comuns para percentagem
_ALIASES = {
    "isento": 0.0,
    "isentos": 0.0,
    "ise": 0.0,
    "0%": 0.0,
    "normal": 23.0,
    "nor": 23.0,
    "reduzida": 6.0,
    "red": 6.0,
    "intermedia": 13.0,
    "intermédia": 13.0,
    "int": 13.0,
    "autoliquidacao": 0.0,
    "autoliquidação": 0.0,
}

# Taxas válidas em Portugal (para validação opcional)
_TAXAS_PT = (0.0, 6.0, 13.0, 23.0)


def parse_taxa_iva(val: str | int | float | None) -> Optional[float]:
    """
    Converte texto em percentagem IVA.
    Retorna float (0-100) ou None se inválido.

    Exemplos:
        "23%" -> 23.0
        "IVA 13%" -> 13.0
        "isento" -> 0.0
        "Taxa normal" -> 23.0
    """
    if val is None:
        return None
    s = str(val).strip().lower()
    if not s:
        return None

    # 1. Alias diretos
    for key, pct in _ALIASES.items():
        if key in s or s == key:
            return pct

    # 2. Padrão numérico: 23, 23%, 23.5, 13,5
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*%?", s)
    if m:
        try:
            n = float(m.group(1).replace(",", "."))
            if 0 <= n <= 100:
                return round(n, 2)
        except ValueError:
            pass

    return None


def parse_taxa_iva_strict(
    val: str | int | float | None,
    validas: tuple[float, ...] = _TAXAS_PT,
) -> Optional[float]:
    """
    Igual a parse_taxa_iva, mas só retorna se a taxa estiver em validas.
    Útil para validar contra taxas portuguesas.
    """
    pct = parse_taxa_iva(val)
    if pct is None:
        return None
    # Aceita pequena tolerância (ex: 22.99 -> 23)
    for v in validas:
        if abs(pct - v) < 0.01:
            return v
    return None


if __name__ == "__main__":
    # Testes rápidos
    for t in ["23%", "13%", "isento", "IVA 23%", "Taxa normal", "6", "autoliquidação"]:
        print(f"{t!r} -> {parse_taxa_iva(t)}")
