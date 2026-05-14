"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { api, type CRMLead, type PipelineColumn } from "@/lib/api";
import { X, Loader2, Users, Save } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatGTQ(value: string | null): string | null {
  if (!value) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 0 }).format(n);
}

function maskPhone(telefono: string): string {
  if (telefono.length <= 4) return telefono;
  return `•••• ${telefono.slice(-4)}`;
}

function diasDesde(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

// ─── Lead Card ──────────────────────────────────────────────────────────────

function LeadCard({ lead, onClick }: { lead: CRMLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(lead.id),
    data: { etapaId: lead.etapaId },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white border border-slate-100 rounded-xl p-3.5 mb-2 cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <p className="font-medium text-[#0A2540] text-sm truncate mb-0.5">
        {lead.nombre ?? <span className="text-slate-300 font-normal italic">Sin nombre</span>}
      </p>
      <p className="text-xs text-slate-400 font-mono">{maskPhone(lead.telefono)}</p>
      <div className="flex items-center justify-between mt-2.5">
        {formatGTQ(lead.valorEstimado) ? (
          <span className="text-xs font-semibold text-[#00C4B4]">{formatGTQ(lead.valorEstimado)}</span>
        ) : (
          <span />
        )}
        <span className="text-xs text-slate-300">{diasDesde(lead.creadoEn)}d</span>
      </div>
    </div>
  );
}

// ─── Lead Card Overlay (shown while dragging) ────────────────────────────────

function LeadCardOverlay({ lead }: { lead: CRMLead }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xl w-[280px] cursor-grabbing rotate-1">
      <p className="font-medium text-[#0A2540] text-sm truncate mb-0.5">
        {lead.nombre ?? <span className="text-slate-300 font-normal italic">Sin nombre</span>}
      </p>
      <p className="text-xs text-slate-400 font-mono">{maskPhone(lead.telefono)}</p>
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  onCardClick,
}: {
  column: PipelineColumn;
  onCardClick: (lead: CRMLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(column.id) });

  const totalValor = column.leads.reduce((sum, l) => {
    return sum + (l.valorEstimado ? parseFloat(l.valorEstimado) : 0);
  }, 0);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Column header */}
      <div
        className="rounded-xl px-3.5 py-3 mb-3"
        style={{ backgroundColor: `${column.color}18` }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <span className="font-semibold text-[#0A2540] text-sm">{column.nombre}</span>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-white rounded-full px-2 py-0.5">
            {column.leads.length}
          </span>
        </div>
        {totalValor > 0 && (
          <p className="text-xs text-slate-400 pl-4.5">
            {new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 0 }).format(totalValor)}
          </p>
        )}
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-xl transition-colors p-1 -m-1 ${
          isOver ? "bg-[#00C4B4]/5 ring-2 ring-[#00C4B4]/20" : ""
        }`}
      >
        {column.leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
        ))}
        {column.leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-300">
            <Users className="w-5 h-5 mb-1.5" />
            <p className="text-xs">Sin leads</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lead Drawer ──────────────────────────────────────────────────────────────

function LeadDrawer({
  lead,
  onClose,
  onSaved,
}: {
  lead: CRMLead;
  onClose: () => void;
  onSaved: (updated: CRMLead) => void;
}) {
  const [form, setForm] = useState({
    notasCRM: lead.notasCRM ?? "",
    valorEstimado: lead.valorEstimado ?? "",
    fechaCierreEstimada: lead.fechaCierreEstimada
      ? lead.fechaCierreEstimada.split("T")[0]
      : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await api.patchCRMLead(lead.id, {
        notasCRM: form.notasCRM || null,
        valorEstimado: form.valorEstimado || null,
        fechaCierreEstimada: form.fechaCierreEstimada
          ? new Date(form.fechaCierreEstimada).toISOString()
          : null,
      });
      onSaved(updated as CRMLead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <p className="font-bold text-[#0A2540]">{lead.nombre ?? "Sin nombre"}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{lead.telefono}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {lead.email && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Email</p>
              <p className="text-sm text-[#0A2540]">{lead.email}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Valor estimado (Q)</label>
            <input
              type="number"
              value={form.valorEstimado}
              onChange={(e) => setForm((f) => ({ ...f, valorEstimado: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Fecha cierre estimada</label>
            <input
              type="date"
              value={form.fechaCierreEstimada}
              onChange={(e) => setForm((f) => ({ ...f, fechaCierreEstimada: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notas CRM</label>
            <textarea
              value={form.notasCRM}
              onChange={(e) => setForm((f) => ({ ...f, notasCRM: e.target.value }))}
              rows={5}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]/40 focus:border-[#00C4B4] resize-none"
              placeholder="Notas sobre este lead..."
            />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#0A2540] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0A2540]/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragLead, setActiveDragLead] = useState<CRMLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const errorRef = useRef<string>("");

  useEffect(() => {
    api
      .getPipeline()
      .then(setColumns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function findLead(leadId: number): CRMLead | undefined {
    for (const col of columns) {
      const lead = col.leads.find((l) => l.id === leadId);
      if (lead) return lead;
    }
  }

  function handleDragStart(event: { active: { id: string | number } }) {
    const lead = findLead(Number(event.active.id));
    if (lead) setActiveDragLead(lead);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = Number(active.id);
    const targetEtapaId = Number(over.id);
    const lead = findLead(leadId);
    if (!lead || lead.etapaId === targetEtapaId) return;

    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === lead.etapaId) {
          return { ...col, leads: col.leads.filter((l) => l.id !== leadId) };
        }
        if (col.id === targetEtapaId) {
          return { ...col, leads: [...col.leads, { ...lead, etapaId: targetEtapaId }] };
        }
        return col;
      })
    );

    api.patchLeadEtapa(leadId, targetEtapaId).catch(() => {
      errorRef.current = "Error al mover lead";
      // Revert
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === targetEtapaId) {
            return { ...col, leads: col.leads.filter((l) => l.id !== leadId) };
          }
          if (col.id === lead.etapaId) {
            return { ...col, leads: [...col.leads, lead] };
          }
          return col;
        })
      );
    });
  }

  function handleLeadSaved(updated: CRMLead) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        leads: col.leads.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)),
      }))
    );
    setSelectedLead((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  }

  if (loading) {
    return (
      <div className="px-8 py-8">
        <div className="mb-8">
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72">
              <Skeleton className="h-14 rounded-xl mb-3" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-20 rounded-xl mb-2" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A2540] tracking-tight">Pipeline CRM</h1>
        <p className="text-slate-400 text-sm mt-1">
          {columns.reduce((sum, c) => sum + c.leads.length, 0)} leads en el embudo
        </p>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 items-start">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCardClick={(lead) => setSelectedLead(lead)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragLead && <LeadCardOverlay lead={activeDragLead} />}
        </DragOverlay>
      </DndContext>

      {/* Lead drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaved={handleLeadSaved}
        />
      )}
    </div>
  );
}
