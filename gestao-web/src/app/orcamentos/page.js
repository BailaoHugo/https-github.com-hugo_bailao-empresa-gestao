import Link from "next/link";

export default function OrcamentosPage() {
  return (
    <div className="max-w-[800px] mx-auto">
      <div className="flex justify-end mb-4">
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-slate-800 text-slate-800 hover:bg-slate-50"
        >
          Voltar ao Dashboard
        </Link>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Módulo Orçamentos</h1>
        <p className="text-slate-600 mb-6">
          O módulo completo de orçamentos (criação, margens, PDF) está disponível na aplicação original.
        </p>
        <p className="text-sm text-slate-500">
          O módulo completo (wizard, catálogo, margens, PDF) será migrado em breve.
        </p>
      </div>
    </div>
  );
}
