import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="max-w-[1100px] mx-auto">
      <header className="text-center my-8">
        <Image
          src="/Logo-Ennova.png"
          alt="Ennova"
          width={320}
          height={120}
          className="mx-auto mb-4 w-[60%] max-w-[320px] h-auto"
        />
        <p className="text-slate-600">Plataforma interna de Gestão da empresa Solid Projects</p>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/base-dados"
          className="block bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-400 transition"
        >
          <h2 className="text-lg font-semibold m-0">Base de Dados</h2>
          <p className="text-sm text-slate-600 m-0 flex-1">
            Consulta de centros de custo e outras entidades
          </p>
          <span className="inline-block w-fit px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-semibold">
            Entrar
          </span>
        </Link>
        <Link
          href="/orcamentos"
          className="block bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-400 transition"
        >
          <h2 className="text-lg font-semibold m-0">Orçamentos</h2>
          <p className="text-sm text-slate-600 m-0 flex-1">
            Criação de orçamentos, gestão de margens e geração de PDFs para clientes
          </p>
          <span className="inline-block w-fit px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-semibold">
            Entrar
          </span>
        </Link>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 opacity-60 pointer-events-none">
          <h2 className="text-lg font-semibold m-0">Gestão de Obras</h2>
          <p className="text-sm text-slate-600 m-0">Em desenvolvimento</p>
          <span className="inline-block w-fit px-2 py-1 rounded-full bg-slate-200 text-xs">Em desenvolvimento</span>
        </div>
        <Link
          href="/custos"
          className="block bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-400 transition"
        >
          <h2 className="text-lg font-semibold m-0">Registo de Custos</h2>
          <p className="text-sm text-slate-600 m-0 flex-1">
            Registo de custos por obra, categorização e análise de desvios
          </p>
          <span className="inline-block w-fit px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-semibold">
            Entrar
          </span>
        </Link>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 opacity-60 pointer-events-none">
          <h2 className="text-lg font-semibold m-0">Planeamento</h2>
          <p className="text-sm text-slate-600 m-0">Em desenvolvimento</p>
          <span className="inline-block w-fit px-2 py-1 rounded-full bg-slate-200 text-xs">Em desenvolvimento</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 opacity-60 pointer-events-none">
          <h2 className="text-lg font-semibold m-0">Faturação</h2>
          <p className="text-sm text-slate-600 m-0">Em desenvolvimento</p>
          <span className="inline-block w-fit px-2 py-1 rounded-full bg-slate-200 text-xs">Em desenvolvimento</span>
        </div>
      </section>
    </div>
  );
}
