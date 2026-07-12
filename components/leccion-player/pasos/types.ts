// Contrato de props común para los 6 componentes de paso (components/leccion-player/pasos/*View.tsx).
// Consumido por el LeccionPlayer — no cambiar la forma sin avisar en status/agent-3-progress.md.

export interface PasoViewProps<P> {
  paso: P;
  /** Llamar UNA sola vez cuando el alumno responde/completa el paso. */
  onResultado: (correcto: boolean) => void;
}
