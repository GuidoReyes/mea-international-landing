import { CheckCircle, XCircle, Download, Calendar, BookOpen, User } from "lucide-react";

interface VerifyResult {
  valid: boolean;
  alumno?: string;
  curso?: string;
  edicion?: string;
  fecha?: string;
  codigo?: string;
  urlPdf?: string | null;
}

async function getCertificado(codigo: string): Promise<VerifyResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mea.edu.gt";
  try {
    const res = await fetch(`${apiUrl}/api/certificados/verify/${codigo}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { valid: false };
    return res.json() as Promise<VerifyResult>;
  } catch {
    return { valid: false };
  }
}

export default async function VerifyPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const data = await getCertificado(codigo);

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Certificado no válido</h1>
          <p className="text-slate-400 text-sm">
            El código <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{codigo}</span> no corresponde a ningún certificado emitido o fue revocado.
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Certificado Verificado</h1>
          <p className="text-slate-400 text-sm mt-1">Este certificado es auténtico y fue emitido por MEA International</p>
        </div>

        {/* Datos */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <User className="w-4 h-4 text-[#00C4B4] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estudiante</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{data.alumno}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <BookOpen className="w-4 h-4 text-[#00C4B4] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Curso</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{data.curso}</p>
              <p className="text-xs text-slate-400">{data.edicion}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <Calendar className="w-4 h-4 text-[#00C4B4] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha de emisión</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{fecha}</p>
            </div>
          </div>
        </div>

        {/* Código */}
        <div className="text-center mb-6">
          <p className="text-xs text-slate-400 mb-1">Código de verificación</p>
          <span className="font-mono text-sm bg-slate-100 px-4 py-1.5 rounded-lg text-slate-600 tracking-widest">
            {data.codigo}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          {data.urlPdf && (
            <a href={data.urlPdf} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0A2540] text-white text-sm font-semibold rounded-xl hover:bg-[#0A2540]/90 transition-colors">
              <Download className="w-4 h-4" />
              Descargar PDF
            </a>
          )}
          <a href="https://www.mea.edu.gt"
            className="flex-1 flex items-center justify-center px-4 py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
            mea.edu.gt
          </a>
        </div>
      </div>
    </div>
  );
}
