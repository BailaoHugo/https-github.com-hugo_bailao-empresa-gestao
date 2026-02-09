"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const PhotoIcon = () => (
  <svg className="w-14 h-14 sm:w-16 sm:h-16 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export default function RegistoCustos() {
  const [step, setStep] = useState("foto");
  const [rawFile, setRawFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [centros, setCentros] = useState([]);
  const [selectedCentro, setSelectedCentro] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [loading, setLoading] = useState(false);
  const cropperRef = useRef(null);
  const inputFileRef = useRef(null);
  const inputCamRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent || "");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    fetch(`${API_URL}/api/centros-custo`)
      .then((r) => r.ok ? r.json() : [])
      .then(setCentros)
      .catch(() => setCentros([]));
  }, [API_URL]);

  useEffect(() => {
    if (step === "camera") return;
    if (!rawFile && !currentFile) setStep("foto");
    else if (rawFile) setStep("crop");
    else setStep("enviar");
  }, [rawFile, currentFile, step]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setRawFile(f);
      setCurrentFile(null);
    }
    e.target.value = "";
  };

  const handleApplyCrop = () => {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.getCroppedCanvas({
      maxWidth: 2000,
      maxHeight: 2000,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (canvas) {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCurrentFile(new File([blob], "recorte.jpg", { type: "image/jpeg" }));
            setRawFile(null);
            cropperRef.current?.destroy();
            cropperRef.current = null;
          }
        },
        "image/jpeg",
        0.92
      );
    }
  };

  const handleSend = async () => {
    if (!selectedCentro || !currentFile) return;
    setLoading(true);
    setMsg({ text: "A enviar...", ok: false });
    try {
      const fd = new FormData();
      fd.append("centro_custo_codigo", selectedCentro);
      fd.append("file", currentFile);
      const r = await fetch(`${API_URL}/api/registar-despesa`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Erro");
      setMsg({ text: "Despesa registada com sucesso.", ok: true });
      setCurrentFile(null);
      setRawFile(null);
      setTimeout(() => setMsg({ text: "", ok: false }), 2000);
    } catch (e) {
      setMsg({ text: e.message || "Erro ao enviar.", ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="flex justify-end mb-2">
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-slate-800 text-slate-800 hover:bg-slate-50"
        >
          Voltar ao Dashboard
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold m-0">Registo de Custos</h1>
        <p className="text-slate-500 m-0 mt-1">
          {step === "foto" && "Registe despesas com foto de fatura ou recibo."}
          {step === "camera" && "Aponte a câmara para a fatura e capture"}
          {step === "crop" && "Ajuste o recorte para remover margens e focar na fatura"}
          {step === "enviar" && "Escolha o centro de custo e envie"}
        </p>
      </header>

      {step === "foto" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            ref={inputFileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <input
            ref={inputCamRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => {
              setCameraError(null);
              if (isIOS) {
                const input = inputCamRef.current;
                if (input) {
                  input.value = "";
                  input.click();
                }
                return;
              }
              navigator.mediaDevices
                .getUserMedia({ video: { facingMode: "environment" } })
                .then((stream) => {
                  setCameraStream(stream);
                  setStep("camera");
                })
                .catch((e) => {
                  const msg =
                    e.name === "NotAllowedError" || e.name === "PermissionDeniedError"
                      ? "O acesso à câmara foi bloqueado. Autorize quando o browser pedir ou use «Escolher da galeria»."
                      : e.message || "Não foi possível aceder à câmara.";
                  setCameraError(msg);
                });
            }}
            className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[120px] p-6 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-50 transition text-left"
          >
            <PhotoIcon />
            <span className="text-sm font-semibold text-slate-600">Tirar foto</span>
            <span className="text-xs text-slate-400">Câmara</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const input = inputFileRef.current;
              if (input) {
                input.value = "";
                input.removeAttribute("capture");
                input.click();
              }
            }}
            className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[120px] p-6 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-50 transition text-left"
          >
            <svg className="w-14 h-14 sm:w-16 sm:h-16 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm font-semibold text-slate-600">Escolher da galeria</span>
            <span className="text-xs text-slate-400">Ficheiro existente</span>
          </button>
        </div>
      )}

      {cameraError && step === "foto" && (
        <div className="mt-3 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {cameraError} Pode usar «Escolher da galeria» como alternativa.
        </div>
      )}

      {step === "camera" && cameraStream && (
        <CameraStep
          stream={cameraStream}
          onCapture={(file) => {
            cameraStream.getTracks().forEach((t) => t.stop());
            setCameraStream(null);
            setRawFile(file);
            setStep("crop");
          }}
          onCancel={() => {
            cameraStream.getTracks().forEach((t) => t.stop());
            setCameraStream(null);
            setStep("foto");
          }}
        />
      )}

      {step === "crop" && rawFile && (
        <CropStep
          file={rawFile}
          cropperRef={cropperRef}
          onApply={handleApplyCrop}
          onCancel={() => setRawFile(null)}
        />
      )}

      {step === "enviar" && currentFile && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <img
            src={URL.createObjectURL(currentFile)}
            alt="Preview"
            className="w-full max-h-[280px] object-contain rounded-lg bg-slate-100 mb-4"
          />
          <div className="flex flex-col gap-2 mb-4">
            <label className="font-medium text-slate-700">Centro de custo</label>
            <select
              value={selectedCentro}
              onChange={(e) => setSelectedCentro(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-md"
            >
              <option value="">— Escolher centro —</option>
              {centros.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} - {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSend}
              disabled={!selectedCentro || loading}
              className="flex-1 px-4 py-3 rounded-md bg-slate-800 text-white font-semibold disabled:opacity-50"
            >
              Enviar
            </button>
            <button
              onClick={() => setCurrentFile(null)}
              className="flex-1 px-4 py-3 rounded-md border border-slate-800 text-slate-800"
            >
              Voltar ao recorte
            </button>
          </div>
        </div>
      )}

      {msg.text && (
        <div
          className={`mt-4 p-3 rounded-md text-sm ${msg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function CameraStep({ stream, onCapture, onCancel }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {}); // iOS exige play() explícito para mostrar o stream
    }
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !stream || video.readyState !== 4) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(new File([blob], "foto.jpg", { type: "image/jpeg" }));
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full w-full h-full object-contain"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCapture}
          className="flex-1 px-4 py-3 rounded-md bg-slate-800 text-white font-semibold"
        >
          Capturar foto
        </button>
        <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-md border border-slate-800 text-slate-800">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CropStep({ file, cropperRef, onApply, onCancel }) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !imgRef.current || !file) return;
    let cropperInstance = null;
    const initCropper = () => {
      import("cropperjs").then(({ default: Cropper }) => {
        if (imgRef.current && !cropperRef.current) {
          cropperInstance = new Cropper(imgRef.current, {
            aspectRatio: NaN,
            viewMode: 1,
            dragMode: "move",
            autoCropArea: 0.9,
          });
          cropperRef.current = cropperInstance;
        }
      });
    };
    if (imgRef.current.complete) initCropper();
    else imgRef.current.onload = initCropper;
    return () => {
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [file]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="w-full h-[320px] bg-slate-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
        <img
          ref={imgRef}
          src={URL.createObjectURL(file)}
          alt="Recorte"
          className="max-w-full max-h-full w-full h-full object-contain block"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onApply}
          className="flex-1 px-4 py-3 rounded-md bg-slate-800 text-white font-semibold"
        >
          Aplicar recorte
        </button>
        <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-md border border-slate-800 text-slate-800">
          Cancelar
        </button>
      </div>
    </div>
  );
}
