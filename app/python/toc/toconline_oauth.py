#!/usr/bin/env python3
import os
import json
import time
import urllib.parse
import urllib.request

def env(name: str, required: bool = True, default: str | None = None) -> str:
    v = os.getenv(name, default)
    if required and (v is None or str(v).strip() == ""):
        raise RuntimeError(f"Falta variável de ambiente: {name}")
    return v

def build_auth_url(auth_url: str, client_id: str, redirect_uri: str, scope: str) -> str:
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
    }
    if scope:
        params["scope"] = scope
    return auth_url + ("&" if "?" in auth_url else "?") + urllib.parse.urlencode(params)

def post_form(url: str, data: dict) -> dict:
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req) as r:
        raw = r.read().decode("utf-8", errors="replace")
    try:
        return json.loads(raw)
    except Exception:
        raise RuntimeError(f"Resposta não-JSON do servidor: {raw[:500]}")

def main():
    auth_url      = env("TOCONLINE_AUTH_URL")
    token_url     = env("TOCONLINE_TOKEN_URL")
    client_id     = env("TOCONLINE_CLIENT_ID")
    client_secret = env("TOCONLINE_CLIENT_SECRET")
    redirect_uri  = env("TOCONLINE_REDIRECT_URI")
    scope         = os.getenv("TOCONLINE_SCOPE", "")
    token_path    = env("TOCONLINE_TOKEN_PATH", required=False, default=os.path.expanduser("~/empresa-gestao/GESTAO_EMPRESA/config/secrets/toconline_token.json"))

    url = build_auth_url(auth_url, client_id, redirect_uri, scope)
    print("\n1) Abre este URL no teu browser (no Mac):\n")
    print(url)
    print("\n2) Faz login e autoriza. Depois vais ser redirecionado para o REDIRECT_URI.")
    print("   Copia o parâmetro 'code' do URL final (ou o código mostrado).")
    code = input("\n3) Cola aqui o 'code': ").strip()
    if not code:
        raise RuntimeError("Não foi fornecido 'code'.")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    token = post_form(token_url, data)
    token["obtained_at"] = int(time.time())

    os.makedirs(os.path.dirname(token_path), exist_ok=True)
    with open(token_path, "w", encoding="utf-8") as f:
        json.dump(token, f, ensure_ascii=False, indent=2)

    try:
        os.chmod(token_path, 0o600)
    except Exception:
        pass

    keys = list(token.keys())
    print(f"\n✅ Token gravado em: {token_path}")
    print("Chaves no token:", keys)
    print("Tem refresh_token?:", "refresh_token" in token)

if __name__ == "__main__":
    main()
