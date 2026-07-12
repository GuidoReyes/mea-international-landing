import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { RutaResumen, colorBadgeNivel } from "@/lib/rutas";

function RutaCard({ ruta }: { ruta: RutaResumen }) {
  return (
    <Link
      href={`/cursos/${ruta.slug}`}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-[#00C4B4]/40 transition-all p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${colorBadgeNivel(
            ruta.nivelMinimo,
            ruta.nivelMaximo
          )}`}
        >
          {ruta.nivelMinimo}–{ruta.nivelMaximo}
        </span>
        {ruta.proximamente && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            Próximamente
          </span>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#0A2540] group-hover:text-[#00C4B4] transition-colors">
          {ruta.titulo}
        </h3>
        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{ruta.descripcion}</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <BookOpen className="w-3.5 h-3.5" />
        {ruta.totalLecciones} lecciones
      </div>

      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#00C4B4] mt-auto">
        Ver ruta <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}

export default function CatalogoRutas({ rutas }: { rutas: RutaResumen[] }) {
  if (rutas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
        Muy pronto vas a poder elegir tu ruta de aprendizaje acá. Escribinos por WhatsApp mientras tanto.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rutas.map((ruta) => (
        <RutaCard key={ruta.id} ruta={ruta} />
      ))}
    </div>
  );
}
