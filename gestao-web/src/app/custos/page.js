import RegistoCustos from "@/components/RegistoCustos";
import Link from "next/link";

export default function CustosPage() {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Link
          href="/custos"
          className="px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium"
        >
          Registo
        </Link>
        <Link
          href="/custos/controlo"
          className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          Controlo de Custos
        </Link>
      </div>
      <RegistoCustos />
    </div>
  );
}
