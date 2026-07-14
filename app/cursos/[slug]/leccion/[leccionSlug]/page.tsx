import LeccionClient from "@/components/cursos-online/LeccionClient";
import SesionAlumnoBadge from "@/components/alumno/SesionAlumnoBadge";

interface Props {
  params: Promise<{ slug: string; leccionSlug: string }>;
}

export default async function LeccionPage({ params }: Props) {
  const { slug, leccionSlug } = await params;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="bg-[#0A2540]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex justify-end">
          <SesionAlumnoBadge />
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <LeccionClient rutaSlug={slug} leccionSlug={leccionSlug} />
      </main>
    </div>
  );
}
