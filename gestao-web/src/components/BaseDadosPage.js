"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function TabelaCentros({ dados, loading, error, onRetry }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <h2 className="px-4 py-3 bg-slate-100 font-semibold">Centros de custo</h2>
      {loading ? (
        <p className="px-4 py-8 text-slate-500">A carregar...</p>
      ) : error ? (
        <div className="px-4 py-8">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={onRetry} className="px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium hover:bg-slate-700">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Código</th>
                <th className="text-left px-4 py-2 font-semibold">Nome</th>
              </tr>
            </thead>
            <tbody>
              {(dados || []).map((row, i) => (
                <tr key={row.centro_custo_codigo ?? `cc-${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">{String(row.centro_custo_codigo ?? "—")}</td>
                  <td className="px-4 py-2">{String(row.centro_custo_nome ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && (
        <p className="px-4 py-2 text-sm text-slate-500 border-t border-slate-100">
          {(dados || []).length} centros de custo
        </p>
      )}
    </div>
  );
}

function TabelaClientes({ dados, loading, error, onRetry }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <h2 className="px-4 py-3 bg-slate-100 font-semibold">Clientes / Empresas</h2>
      {loading ? (
        <p className="px-4 py-8 text-slate-500">A carregar...</p>
      ) : error ? (
        <div className="px-4 py-8">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={onRetry} className="px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium hover:bg-slate-700">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">ID</th>
                <th className="text-left px-4 py-2 font-semibold">Designação</th>
                <th className="text-left px-4 py-2 font-semibold">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {(dados || []).map((row, i) => (
                <tr key={String(row.id ?? `cl-${i}`)} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">{String(row.id ?? "—")}</td>
                  <td className="px-4 py-2">{String(row.business_name ?? "—")}</td>
                  <td className="px-4 py-2 text-slate-600">{String(row.contact_name ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && (
        <p className="px-4 py-2 text-sm text-slate-500 border-t border-slate-100">
          {(dados || []).length} clientes
        </p>
      )}
    </div>
  );
}

function TabelaFornecedores({ dados, loading, error, onRetry }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <h2 className="px-4 py-3 bg-slate-100 font-semibold">Fornecedores</h2>
      {loading ? (
        <p className="px-4 py-8 text-slate-500">A carregar...</p>
      ) : error ? (
        <div className="px-4 py-8">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={onRetry} className="px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium hover:bg-slate-700">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">ID</th>
                <th className="text-left px-4 py-2 font-semibold">Designação</th>
                <th className="text-left px-4 py-2 font-semibold">Observações</th>
              </tr>
            </thead>
            <tbody>
              {(dados || []).map((row, i) => (
                <tr key={String(row.id ?? `fn-${i}`)} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">{String(row.id ?? "—")}</td>
                  <td className="px-4 py-2">{String(row.business_name ?? "—")}</td>
                  <td className="px-4 py-2 text-slate-600">{String(row.internal_observations ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && (
        <p className="px-4 py-2 text-sm text-slate-500 border-t border-slate-100">
          {(dados || []).length} fornecedores
        </p>
      )}
    </div>
  );
}

export default function BaseDadosPage() {
  const [centros, setCentros] = useState([]);
  const [centrosLoading, setCentrosLoading] = useState(true);
  const [centrosError, setCentrosError] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedoresLoading, setFornecedoresLoading] = useState(true);
  const [fornecedoresError, setFornecedoresError] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [clientesError, setClientesError] = useState(null);
  const ref = useRef(true);

  const fetchCentros = () => {
    setCentrosLoading(true);
    setCentrosError(null);
    fetch(`${API_URL}/api/base-dados/centros-custo`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((res) => { if (ref.current) setCentros(Array.isArray(res?.dados) ? res.dados : []); })
      .catch((e) => { if (ref.current) setCentrosError(e.message); })
      .finally(() => { if (ref.current) setCentrosLoading(false); });
  };

  const fetchFornecedores = () => {
    setFornecedoresLoading(true);
    setFornecedoresError(null);
    fetch(`${API_URL}/api/base-dados/fornecedores`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((res) => { if (ref.current) setFornecedores(Array.isArray(res?.dados) ? res.dados : []); })
      .catch((e) => { if (ref.current) setFornecedoresError(e.message); })
      .finally(() => { if (ref.current) setFornecedoresLoading(false); });
  };

  const fetchClientes = () => {
    setClientesLoading(true);
    setClientesError(null);
    fetch(`${API_URL}/api/base-dados/clientes`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((res) => { if (ref.current) setClientes(Array.isArray(res?.dados) ? res.dados : []); })
      .catch((e) => { if (ref.current) setClientesError(e.message); })
      .finally(() => { if (ref.current) setClientesLoading(false); });
  };

  useEffect(() => {
    ref.current = true;
    fetchCentros();
    fetchFornecedores();
    fetchClientes();
    return () => { ref.current = false; };
  }, []);

  return (
    <div className="max-w-[900px] mx-auto">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-block mb-4 px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold m-0">Base de Dados</h1>
      </header>

      <div className="space-y-6">
        <TabelaFornecedores dados={fornecedores} loading={fornecedoresLoading} error={fornecedoresError} onRetry={fetchFornecedores} />
        <TabelaClientes dados={clientes} loading={clientesLoading} error={clientesError} onRetry={fetchClientes} />
        <TabelaCentros dados={centros} loading={centrosLoading} error={centrosError} onRetry={fetchCentros} />
      </div>
    </div>
  );
}
