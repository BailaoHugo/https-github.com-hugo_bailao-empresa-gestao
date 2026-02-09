"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const TIPOS_LABEL = {
  subempreitadas: "Subempreitadas",
  materiais: "Materiais",
  mao_obra: "Mão de obra",
  equipamentos_maquinaria: "Equipamentos e maquinaria",
  custos_sede: "Custos sede",
};

function formatValor(v) {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "—";
}

export default function ControloCustos() {
  const [obras, setObras] = useState([]);
  const [selectedObra, setSelectedObra] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCapitulo, setFiltroCapitulo] = useState("");
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/custos/obras`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setObras)
      .catch(() => setObras([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/custos/capitulos`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCapitulos)
      .catch(() => setCapitulos([]));
  }, []);

  useEffect(() => {
    if (!selectedObra) {
      setDetalhe(null);
      return;
    }
    let url = `${API_URL}/api/custos/obras/${encodeURIComponent(selectedObra)}`;
    const params = new URLSearchParams();
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroCapitulo) params.set("capitulo", filtroCapitulo);
    if (params.toString()) url += "?" + params.toString();
    fetch(url)
      .then((r) => (r.ok ? r.json() : { linhas: [] }))
      .then(setDetalhe)
      .catch(() => setDetalhe({ linhas: [] }));
  }, [selectedObra, filtroTipo, filtroCapitulo]);

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto p-4">
        <p className="text-slate-500">A carregar custos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      <header className="mb-6">
        <div className="flex gap-2 mb-4">
          <Link
            href="/custos"
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Registo
          </Link>
          <Link
            href="/custos/controlo"
            className="px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium"
          >
            Controlo de Custos
          </Link>
        </div>
        <h1 className="text-2xl font-semibold m-0">Controlo de Custos por Obra</h1>
      </header>

      {obras.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">Nenhuma obra com custos registados.</p>
          <p className="text-sm text-slate-500 mt-2">
            Execute <code className="bg-slate-100 px-1 rounded">alimentar_custos_registo.py</code> ou registe custos por email/foto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h2 className="px-4 py-3 bg-slate-100 font-semibold">Obras</h2>
            <ul className="divide-y divide-slate-100">
              {obras.map((o) => (
                <li key={o.centro_custo_codigo}>
                  <button
                    onClick={() => setSelectedObra(o.centro_custo_codigo)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${
                      selectedObra === o.centro_custo_codigo ? "bg-slate-100 font-medium" : ""
                    }`}
                  >
                    <span className="block font-medium">{o.centro_custo_codigo}</span>
                    <span className="block text-sm text-slate-600">{formatValor(o.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-2 space-y-4">
            {selectedObra && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">Totais por tipo — {selectedObra}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(TIPOS_LABEL).map(([key, label]) => {
                      const obra = obras.find((o) => o.centro_custo_codigo === selectedObra);
                      const val = obra?.[key] ?? 0;
                      return (
                        <div key={key} className="bg-slate-50 rounded p-2">
                          <span className="text-xs text-slate-500">{label}</span>
                          <span className="block font-semibold">{formatValor(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <select
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                      className="border border-slate-200 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="">Todos os tipos</option>
                      {Object.entries(TIPOS_LABEL).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                    </select>
                    <select
                      value={filtroCapitulo}
                      onChange={(e) => setFiltroCapitulo(e.target.value)}
                      className="border border-slate-200 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="">Todos os capítulos</option>
                      {capitulos.map((c) => (
                        <option key={c.id} value={c.id}>{c.id} — {c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <h3 className="font-semibold mb-2">Linhas de custo</h3>
                  {detalhe?.linhas?.length ? (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="text-left px-2 py-2">Data</th>
                            <th className="text-left px-2 py-2">Doc.</th>
                            <th className="text-left px-2 py-2">Fornecedor</th>
                            <th className="text-left px-2 py-2">Descrição</th>
                            <th className="text-left px-2 py-2">Cap.</th>
                            <th className="text-right px-2 py-2">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalhe.linhas.map((l, i) => (
                            <tr key={l.line_id || i} className="border-t border-slate-100">
                              <td className="px-2 py-1.5">{l.date || "—"}</td>
                              <td className="px-2 py-1.5">{l.document_no || "—"}</td>
                              <td className="px-2 py-1.5 truncate max-w-[120px]" title={l.supplier}>{l.supplier || "—"}</td>
                              <td className="px-2 py-1.5 truncate max-w-[150px]" title={l.description}>{l.description || "—"}</td>
                              <td className="px-2 py-1.5">{l.capitulo_orcamento || "—"}</td>
                              <td className="px-2 py-1.5 text-right">{formatValor(l.net_amount ?? l.unit_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Nenhuma linha para os filtros seleccionados.</p>
                  )}
                </div>
              </>
            )}
            {!selectedObra && (
              <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
                Selecione uma obra para ver o detalhe.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
