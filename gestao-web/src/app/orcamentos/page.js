"use client";

import Link from "next/link";

const ORCAMENTOS_WIZARD_URL = "https://orcamentos-web-one.vercel.app";

export default function OrcamentosPage() {
  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex justify-end mb-4">
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-slate-800 text-slate-800 hover:bg-slate-50"
        >
          Voltar ao Dashboard
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold m-0">Módulo Orçamentos</h1>
        <p className="text-slate-600 m-0 mt-1">
          Criação de orçamentos, gestão de margens e geração de PDFs para clientes
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href={ORCAMENTOS_WIZARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-3 hover:border-slate-400 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold m-0">Novos orçamentos</h2>
          <p className="text-sm text-slate-600 m-0 flex-1">
            Criar novo orçamento com wizard completo: dados da obra, catálogo, margens e geração de PDF
          </p>
          <span className="inline-block w-fit px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-semibold">
            Abrir
          </span>
        </a>

        <Link
          href="/orcamentos/guardados"
          className="block bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-3 hover:border-slate-400 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold m-0">Orçamentos guardados</h2>
          <p className="text-sm text-slate-600 m-0 flex-1">
            Consultar orçamentos registados no ficheiro Excel do sistema
          </p>
          <span className="inline-block w-fit px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-semibold">
            Ver lista
          </span>
        </Link>
      </section>

      <div className="mt-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
        <strong>Nota:</strong> Os orçamentos criados em &quot;Novos orçamentos&quot; ficam guardados no browser (localStorage). Para aparecerem em &quot;Orçamentos guardados&quot;, teriam de ser exportados para o ficheiro Excel do sistema.
      </div>
    </div>
  );
}
