import { CheckCircle, XCircle, Download, Award } from "lucide-react";

interface VerifyOnlineResult {
  valid: boolean;
  alumno?: string;
  curso?: string;
  puntaje?: number;
  fecha?: string;
  codigo?: string;
  urlPdf?: string | null;
}

async function getCertificadoOnline(codigo: string): Promise<VerifyOnlineResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
  try {
    const res = await fetch(`${apiUrl}/api/certificados-online/verify/${codigo}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { valid: false };
    return res.json() as Promise<VerifyOnlineResult>;
  } catch {
    return { valid: false };
  }
}

export default async function VerifyOnlinePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const data = await getCertificadoOnline(codigo);

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Certificado no válido</h1>
          <p className="text-slate-400 text-sm">
            El código{" "}
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{codigo}</span> no
            corresponde a ningún certificado emitido.
          </p>
          <a href="https://www.mea.edu.gt" className="mt-6 inline-block text-xs text-[#00C4B4] hover:underline">
            Volver a mea.edu.gt
          </a>
        </div>
      </div>
    );
  }

  const fecha = data.fecha
    ? new Date(data.fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-xl font-bold text-[#0A2540] mb-1">Certificado verificado</h1>
        <p className="text-slate-400 text-sm mb-8">Curso online autoguiado · MEA International</p>

        <div className="space-y-4 text-left bg-slate-50 rounded-xl p-6 mb-6">
          <div>
            <p className="text-xs text-slate-400">Alumno</p>
            <p className="font-bold text-[#0A2540]">{data.alumno}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Curso</p>
            <p className="font-semibold text-[#0A2540]">{data.curso}</p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-slate-400">Puntaje</p>
              <p className="font-semibold text-[#00C4B4] inline-flex items-center gap-1">
                <Award className="w-4 h-4" /> {data.puntaje}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Emitido</p>
              <p className="font-semibold text-[#0A2540]">{fecha}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400">Código</p>
            <p className="font-mono text-xs text-slate-500">{data.codigo}</p>
          </div>
        </div>

        {data.urlPdf && (
          <a
            href={data.urlPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00C4B4] text-white rounded-full font-bold text-sm hover:bg-[#00a898] transition-all"
          >
            <Download className="w-4 h-4" /> Descargar PDF
          </a>
        )}
      </div>
    </div>
  );
}
