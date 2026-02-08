# App Registo Despesa (Foto)

Registo de despesas através de foto de fatura/recibo.

## Requisitos

- Tesseract OCR (para extração de texto): `sudo apt install tesseract-ocr tesseract-ocr-por`
- API a correr em http://localhost:8000

## Executar

```bash
# 1. Terminal 1 - API
~/empresa-gestao/GESTAO_EMPRESA/scripts/run_api.sh

# 2. Terminal 2 - App
cd ~/empresa-gestao/GESTAO_EMPRESA/app/web/custos-web && npm run dev

# 3. Abrir http://localhost:5174
```

Em telemóvel: use o IP da máquina (ex. http://192.168.1.x:5174) para tirar fotos diretamente.
