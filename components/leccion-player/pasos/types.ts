// Contrato de props común para los 6 componentes de paso (components/leccion-player/pasos/*View.tsx).
// Consumido por el LeccionPlayer — no cambiar la forma sin avisar en status/agent-3-progress.md.

export interface PasoViewProps<P> {
  paso: P;
  /** Llamar UNA sola vez cuando el alumno responde/completa el paso. */
  onResultado: (correcto: boolean) => void;
  /**
   * Solo para pasos que arman una respuesta en varios toques antes de poder
   * verificar (ordenar, completar con texto libre): reporta si ya se puede
   * habilitar el botón "Verificar" de la barra inferior del LessonPlayer.
   */
  onPuedeVerificarChange?: (puede: boolean) => void;
}

// Implementado vía forwardRef solo por los pasos de PasoViewProps que necesitan
// un "Verificar" externo (ordenar, completar en modo texto libre) — el resto
// verifica al tocar la tarjeta y no necesita ref.
export interface PasoViewHandle {
  verificar: () => void;
}
