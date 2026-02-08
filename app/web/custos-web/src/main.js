import "./style.css";
import "cropperjs/dist/cropper.css";
import Cropper from "cropperjs";

const API_URL = import.meta.env.VITE_API_URL || "";
const app = document.getElementById("app");

const photoIcon = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

let centros = [];
let rawFile = null;      // ficheiro original da câmara
let currentFile = null;  // ficheiro a enviar (após recorte)
let cropperInstance = null;

async function loadCentros() {
  try {
    const r = await fetch(`${API_URL}/api/centros-custo`);
    if (r.ok) centros = await r.json();
  } catch (e) {
    console.error("Erro ao carregar centros", e);
  }
}

function render() {
  // Estado 1: botão para tirar foto
  if (!rawFile && !currentFile) {
    app.innerHTML = `
      <header class="module-header">
        <img class="home-logo" src="/Logo-Ennova.png" alt="Ennova" />
        <h1>Registo de Custos</h1>
        <p>Registe despesas com foto de fatura ou recibo</p>
      </header>
      <label for="file-input" class="photo-btn">
        ${photoIcon}
        <span class="label">Registar despesa</span>
      </label>
      <input type="file" id="file-input" accept="image/*" capture="environment" />
    `;
    document.getElementById("file-input").addEventListener("change", onFileSelected);
    return;
  }

  // Estado 2: recortar imagem
  if (rawFile && !currentFile) {
    const url = URL.createObjectURL(rawFile);
    app.innerHTML = `
      <header class="module-header">
        <h1>Recortar fatura</h1>
        <p>Ajuste o recorte para remover margens e focar na fatura</p>
      </header>
      <div class="step-panel">
        <div class="crop-container">
          <img id="crop-image" src="${url}" alt="Recorte" />
        </div>
        <div class="btn-row">
          <button class="btn" id="apply-crop">Aplicar recorte</button>
          <button class="btn btn-outline" id="cancel-crop">Cancelar</button>
        </div>
      </div>
    `;

    const img = document.getElementById("crop-image");
    img.onload = () => {
      cropperInstance = new Cropper(img, {
        aspectRatio: NaN,
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.9,
      });
    };

    document.getElementById("apply-crop").addEventListener("click", onApplyCrop);
    document.getElementById("cancel-crop").addEventListener("click", () => {
      URL.revokeObjectURL(url);
      if (cropperInstance) cropperInstance.destroy();
      cropperInstance = null;
      rawFile = null;
      render();
    });
    return;
  }

  // Estado 3: centro de custo + enviar
  if (currentFile) {
    const opts = centros
      .map((c) => `<option value="${c.codigo}">${c.codigo} - ${c.nome}</option>`)
      .join("");
    const previewUrl = URL.createObjectURL(currentFile);

    app.innerHTML = `
      <header class="module-header">
        <h1>Registo de Custos</h1>
        <p>Escolha o centro de custo e envie</p>
      </header>
      <div class="step-panel">
        <img id="preview" src="${previewUrl}" alt="Preview" />
        <div class="field">
          <label for="centro">Centro de custo</label>
          <select id="centro">
            <option value="">— Escolher centro —</option>
            ${opts}
          </select>
        </div>
        <div class="btn-row">
          <button class="btn" id="send" disabled>Enviar</button>
          <button class="btn btn-outline" id="cancel">Voltar ao recorte</button>
        </div>
      </div>
      <div id="msg"></div>
    `;

    document.getElementById("centro").addEventListener("change", (e) => {
      document.getElementById("send").disabled = !e.target.value;
    });
    document.getElementById("send").addEventListener("click", () => doSend());
    document.getElementById("cancel").addEventListener("click", () => {
      URL.revokeObjectURL(previewUrl);
      currentFile = null;
      render();
    });
    return;
  }
}

function onFileSelected(e) {
  const f = e.target.files[0];
  if (f) {
    rawFile = f;
    currentFile = null;
    render();
  }
  e.target.value = "";
}

function onApplyCrop() {
  if (!cropperInstance) return;
  const canvas = cropperInstance.getCroppedCanvas({
    maxWidth: 2000,
    maxHeight: 2000,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });
  if (!canvas) return;
  canvas.toBlob(
    (blob) => {
      if (blob) {
        currentFile = new File([blob], "recorte.jpg", { type: "image/jpeg" });
        rawFile = null;
        cropperInstance.destroy();
        cropperInstance = null;
        render();
      }
    },
    "image/jpeg",
    0.92
  );
}

async function doSend() {
  const centro = document.getElementById("centro")?.value?.trim();
  if (!centro || !currentFile) return;

  const sendBtn = document.getElementById("send");
  const msgEl = document.getElementById("msg");
  sendBtn.disabled = true;
  msgEl.textContent = "A enviar...";
  msgEl.className = "";

  try {
    const fd = new FormData();
    fd.append("centro_custo_codigo", centro);
    fd.append("file", currentFile);
    const r = await fetch(`${API_URL}/api/registar-despesa`, {
      method: "POST",
      body: fd,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Erro");
    msgEl.textContent = "Despesa registada com sucesso.";
    msgEl.className = "ok";
    currentFile = null;
    rawFile = null;
    setTimeout(render, 1500);
  } catch (e) {
    msgEl.textContent = e.message || "Erro ao enviar.";
    msgEl.className = "err";
    sendBtn.disabled = false;
  }
}

loadCentros().then(render);
