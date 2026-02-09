"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function OrcamentosGuardadosPage() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/orcamentos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setOrcamentos(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(() => {
        setOrcamentos([]);
        setError("Não foi possível carregar os orçamentos.");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatValor = (v) => {
    if (v == null) return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString("pt-PT", { minimumFractionDigits: 2 }) : "—";
  };

  const formatData = (d) => {
    if (!d) return "—";
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Link
          href="/orcamentos"
          className="px-4 py-2 rounded-md border border-slate-800 text-slate-800 hover:bg-slate-50"
        >
          ← Voltar
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-slate-800 text-slate-800 hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold m-0">Orçamentos guardados</h1>
        <p className="text-slate-600 m-0 mt-1">
          Lista de orçamentos do ficheiro Excel do sistema
        </p>
      </header>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
          A carregar orçamentos...
        </div>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          {error}
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600 mb-2">
            Nenhum orçamento encontrado no ficheiro <code className="text-sm bg-slate-100 px-1 rounded">orcamentos_cabecalho.xlsx</code>.
          </p>
          <p className="text-sm text-slate-500">
            Os orçamentos criados em &quot;Novos orçamentos&quot; ficam no localStorage do browser. Esta lista mostra apenas os do ficheiro Excel do sistema.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Obra</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((o, i) => (
                  <tr
                    key={o.orcamento_id || i}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-sm">{o.orcamento_id}</td>
                    <td className="px-4 py-3">{o.nome_obra || "—"}</td>
                    <td className="px-4 py-3">{o.cliente || "—"}</td>
                    <td className="px-4 py-3">{formatData(o.data_orcamento)}</td>
                    <td className="px-4 py-3">{o.estado || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatValor(o.total_previsto)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
