import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError

from toconline_export_all import main as export_all_main

TOKEN_PATH = Path(os.getenv("TOCONLINE_TOKEN_PATH", "toconline_token.json"))


def load_config() -> dict:
    client_id = os.getenv("TOCONLINE_CLIENT_ID")
    client_secret = os.getenv("TOCONLINE_CLIENT_SECRET")
    oauth_base = os.getenv("TOCONLINE_OAUTH_BASE", "https://app17.toconline.pt/oauth")
    redirect_uri = os.getenv("TOCONLINE_REDIRECT_URI", "http://localhost:8080/callback")
    scope = os.getenv("TOCONLINE_SCOPE", "commercial")

    missing = [k for k, v in {
        "TOCONLINE_CLIENT_ID": client_id,
        "TOCONLINE_CLIENT_SECRET": client_secret,
    }.items() if not v]
    if missing:
        raise RuntimeError(
            "Faltam variaveis de ambiente: " + ", ".join(missing)
        )

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "oauth_base": oauth_base.rstrip("/"),
        "redirect_uri": redirect_uri,
        "scope": scope,
    }


def refresh_token(config: dict, refresh_token_value: str) -> dict:
    token_url = f"{config['oauth_base']}/token"
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token_value,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "scope": config["scope"],
    }
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(token_url, data=body)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = resp.read().decode("utf-8")
    token = json.loads(payload)
    token["obtained_at"] = int(time.time())
    return token


def test_token(api_base: str, access_token: str) -> bool:
    url = f"{api_base.rstrip('/')}/api/expense_categories"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("Accept", "application/vnd.api+json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200
    except HTTPError as exc:
        if exc.code in (401, 403):
            return False
        raise


def load_token() -> dict:
    if not TOKEN_PATH.exists():
        raise FileNotFoundError(
            f"Nao encontrei {TOKEN_PATH.resolve()}. "
            "Corre primeiro o toconline_oauth.py."
        )
    return json.loads(TOKEN_PATH.read_text(encoding="utf-8"))


def save_token(token: dict) -> None:
    TOKEN_PATH.write_text(json.dumps(token, indent=2), encoding="utf-8")


def ensure_valid_token() -> None:
    config = load_config()
    api_base = os.getenv("TOCONLINE_API_BASE", "https://api17.toconline.pt")

    token = load_token()
    refresh_value = token.get("refresh_token")

    if refresh_value:
        new_token = refresh_token(config, refresh_value)
        save_token(new_token)
        return

    access_token = token.get("access_token")
    if not access_token:
        raise RuntimeError("Token sem access_token. Corre toconline_oauth.py.")

    if not test_token(api_base, access_token):
        raise RuntimeError("Token expirado. Corre toconline_oauth.py.")


def main() -> None:
    ensure_valid_token()
    export_all_main()
    print("✅ Atualizacao concluida.")


if __name__ == "__main__":
    main()
