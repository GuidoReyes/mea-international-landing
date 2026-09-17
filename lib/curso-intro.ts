// Introducción SEO (300-600 palabras) para cada página /cursos/[slug].
// Solo "paraQuien" está curado a mano (framing editorial derivado del
// nombre/descripción real de cada ruta). Todo lo demás (nivel, cantidad de
// lecciones/capítulos, temas de ejemplo) se arma en runtime a partir de
// RutaCurriculum real — así el texto nunca queda desincronizado del
// currículum, y no se inventan cifras ni duración fija (no existe un dato de
// duración en el modelo; se describe como autoguiado, sin fecha límite).

import type { RutaCurriculum } from "./rutas";

export interface CursoIntroEditorial {
  paraQuien: string;
}

const CURSO_INTROS: Record<string, CursoIntroEditorial> = {
  general:
    {
      paraQuien:
        "cualquier persona que quiera aprender inglés desde cero o reforzar un nivel específico, sin importar su punto de partida",
    },
  viajar: {
    paraQuien:
      "personas que viajan por trabajo o turismo y necesitan comunicarse con confianza en aeropuertos, hoteles, transporte y restaurantes",
  },
  restaurantes: {
    paraQuien: "personal de restaurantes (meseros, cocina, anfitriones) que atiende clientes de habla inglesa",
  },
  talleres: {
    paraQuien:
      "mecánicos y personal de taller automotriz que necesita explicar diagnósticos, reparaciones y presupuestos en inglés",
  },
  oficina: {
    paraQuien:
      "profesionales de oficina que necesitan escribir correos, participar en reuniones y hacer presentaciones en inglés",
  },
  "tecnicos-pc": {
    paraQuien: "técnicos de soporte y personal de TI que atiende reportes, tickets y soporte remoto en inglés",
  },
  "call-center": {
    paraQuien:
      "agentes y personal de call center que atiende, negocia y resuelve reclamos con clientes de habla inglesa",
  },
};

export function getCursoIntroEditorial(slug: string): CursoIntroEditorial | null {
  return CURSO_INTROS[slug] ?? null;
}

export function cursoIntroParrafos(ruta: RutaCurriculum, editorial: CursoIntroEditorial): string[] {
  const totalLecciones = ruta.capitulos.reduce((sum, cap) => sum + cap.lecciones.length, 0);
  const totalCapitulos = ruta.capitulos.length;
  const temasEjemplo = ruta.capitulos.slice(0, 8).map((c) => c.titulo);
  const restantes = Math.max(totalCapitulos - temasEjemplo.length, 0);

  const parrafo1 = [
    `${ruta.titulo} está pensado para ${editorial.paraQuien}.`,
    ruta.descripcion,
    `Cubre niveles de ${ruta.nivelMinimo} a ${ruta.nivelMaximo}, con ${totalLecciones} lecciones organizadas en ${totalCapitulos} capítulos.`,
    "Podés empezar gratis: las primeras lecciones de cada ruta son de acceso libre, y el resto se desbloquea con un plan de MEA International.",
    "Todos los planes incluyen soporte vía WhatsApp para resolver dudas mientras avanzás, y si no estás seguro de tu nivel, podés pedir una evaluación gratuita antes de empezar.",
  ].join(" ");

  const listaTemas =
    temasEjemplo.length > 1
      ? `${temasEjemplo.slice(0, -1).join(", ")} y ${temasEjemplo[temasEjemplo.length - 1]}`
      : temasEjemplo[0] ?? "";

  const parrafo2 = [
    `A lo largo del curso vas a practicar situaciones reales como ${listaTemas}${
      restantes > 0 ? `, entre otros ${restantes} capítulos más` : ""
    }.`,
    "Cada lección combina distintos tipos de ejercicio interactivo: vocabulario con traducción, preguntas de opción múltiple, completar frases, ordenar oraciones, emparejar palabras, ejercicios de escucha y práctica de pronunciación oral, para que el aprendizaje sea activo y no solo teórico.",
    "Podés ver tu progreso en tiempo real dentro de la ruta: cuántas lecciones completaste y qué porcentaje del curso llevás avanzado.",
    "Las lecciones se desbloquean de forma progresiva a medida que avanzás, así que siempre sabés cuál sigue.",
  ].join(" ");

  const parrafo3 = [
    "La modalidad es 100% online: accedés a las lecciones interactivas de la plataforma a tu propio ritmo, sin una fecha límite fija, y podés sumar clases grupales en vivo por Zoom si querés practicar con un maestro — se organizan por grupo y nivel, con horarios semanales fijos, y podés sumarte sin perder tu avance en la plataforma.",
    "Al completar la ruta, recibís un certificado verificable de MEA International, con un código que cualquiera puede confirmar en el sitio.",
    "Si ya tenés un nivel de inglés y querés arrancar directamente en este curso, podés ver los planes disponibles o revisar el horario de clases en vivo.",
  ].join(" ");

  return [parrafo1, parrafo2, parrafo3];
}
