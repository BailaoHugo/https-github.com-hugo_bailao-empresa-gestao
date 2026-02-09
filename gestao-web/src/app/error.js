"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="max-w-[600px] mx-auto p-6">
      <h2 className="text-xl font-semibold text-red-700 mb-2">Erro na aplicação</h2>
      <p className="text-slate-600 mb-4 font-mono text-sm">{error?.message || String(error)}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>
    </div>
  );
}
