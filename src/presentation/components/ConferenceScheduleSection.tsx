import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useConferenceActivities } from "../../application/hooks/useConferenceActivities";
import { useActivityCheckins } from "../../application/hooks/useActivityCheckins";
import { useActivityRating } from "../../application/hooks/useActivityRating";
import { MediaStorageRepository } from "../../infrastructure/supabase/repositories/MediaStorageRepository";
import type { ActivityInput } from "../../infrastructure/supabase/repositories/ActivitiesRepository";
import type { ConferenceActivity } from "../../domain/entities/types";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Agrupa em "dd/MM/yyyy" (chave estável pra ordenar) — a exibição usa
 * o formato por extenso (`EEEE, dd 'de' MMMM`). */
function groupByDay(activities: ConferenceActivity[]): [string, ConferenceActivity[]][] {
  const groups = new Map<string, ConferenceActivity[]>();
  for (const activity of activities) {
    const key = format(new Date(activity.dataHoraInicio), "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(activity);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function ActivityForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  initial?: Partial<{ titulo: string; descricao: string; local: string; inicio: string; fim: string }>;
  onSubmit: (input: ActivityInput) => Promise<boolean | ConferenceActivity | null>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [local, setLocal] = useState(initial?.local ?? "");
  const [inicio, setInicio] = useState(initial?.inicio ?? "");
  const [fim, setFim] = useState(initial?.fim ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!inicio || !fim) {
      setFormError("Informe início e fim da atividade.");
      return;
    }
    if (new Date(fim) <= new Date(inicio)) {
      setFormError("O fim precisa ser depois do início.");
      return;
    }
    const result = await onSubmit({
      titulo,
      descricao,
      local,
      dataHoraInicioISO: new Date(inicio).toISOString(),
      dataHoraFimISO: new Date(fim).toISOString(),
    });
    if (result) {
      setTitulo("");
      setDescricao("");
      setLocal("");
      setInicio("");
      setFim("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-ink-800/40 border border-ink-700 rounded-2xl p-4 space-y-3">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título da atividade"
        required
        className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
      />
      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição"
        rows={2}
        className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none resize-none"
      />
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Local (sala, auditório...)"
        required
        className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Início</label>
          <input
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
            className="w-full bg-ink-900 border border-ink-700 rounded-xl p-2.5 text-sm text-ink-100 focus:border-coral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Fim</label>
          <input
            type="datetime-local"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            required
            className="w-full bg-ink-900 border border-ink-700 rounded-xl p-2.5 text-sm text-ink-100 focus:border-coral-500 focus:outline-none"
          />
        </div>
      </div>
      {formError && <p className="text-xs text-red-400">{formError}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2 rounded-xl text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !titulo.trim() || !local.trim()}
          className="flex-1 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-2 rounded-xl text-sm"
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ActivityCoverUpload({ activity, onUploaded }: { activity: ConferenceActivity; onUploaded: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const path = MediaStorageRepository.activityCoverPath(activity.id, file);
      const url = await MediaStorageRepository.uploadFile(path, file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a capa.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-500 cursor-pointer">
        {isUploading ? "Enviando..." : activity.capaUrl ? "Trocar capa" : "Adicionar capa"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/** Estrelas clicáveis (própria nota) + média pública ao lado — só
 * aparece pra quem já fez check-in (mesma regra da RLS de insert). */
function ActivityRatingWidget({ activityId }: { activityId: string }) {
  const { myRating, summary, rate, isSubmitting } = useActivityRating(activityId);
  const [hoverStar, setHoverStar] = useState(0);
  const activeStar = hoverStar || myRating?.nota || 0;

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-0.5" onMouseLeave={() => setHoverStar(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => rate(star)}
            onMouseEnter={() => setHoverStar(star)}
            disabled={isSubmitting}
            aria-label={`${star} estrelas`}
          >
            <Star size={14} className={star <= activeStar ? "fill-amber-500 text-amber-500" : "text-ink-600"} />
          </button>
        ))}
      </div>
      {summary && summary.total > 0 && (
        <span className="text-[10px] text-ink-500">
          {summary.media?.toFixed(1)} ({summary.total})
        </span>
      )}
    </div>
  );
}

function ActivityRow({
  activity,
  isCreator,
  onUpdate,
  onDelete,
  isSubmitting,
  canCheckin,
  isCheckedIn,
  isCheckingIn,
  onCheckin,
}: {
  activity: ConferenceActivity;
  isCreator: boolean;
  onUpdate: (id: string, input: Partial<ActivityInput>) => Promise<boolean>;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
  canCheckin: boolean;
  isCheckedIn: boolean;
  isCheckingIn: boolean;
  onCheckin: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="space-y-2">
        <ActivityForm
          initial={{
            titulo: activity.titulo,
            descricao: activity.descricao,
            local: activity.local,
            inicio: toDatetimeLocalValue(activity.dataHoraInicio),
            fim: toDatetimeLocalValue(activity.dataHoraFim),
          }}
          isSubmitting={isSubmitting}
          submitLabel="Salvar"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (input) => {
            const ok = await onUpdate(activity.id, input);
            if (ok) setIsEditing(false);
            return ok;
          }}
        />
        <ActivityCoverUpload activity={activity} onUploaded={(url) => onUpdate(activity.id, { capaUrl: url })} />
      </div>
    );
  }

  return (
    <div className="flex gap-3 bg-ink-800/60 border border-ink-700 rounded-xl p-3">
      <div
        className="w-14 h-14 rounded-lg bg-ink-700 shrink-0 bg-cover bg-center"
        style={activity.capaUrl ? { backgroundImage: `url(${activity.capaUrl})` } : undefined}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-100 truncate">{activity.titulo}</p>
        <p className="text-xs text-ink-400 mt-0.5">
          {format(new Date(activity.dataHoraInicio), "HH:mm")} – {format(new Date(activity.dataHoraFim), "HH:mm")}
        </p>
        <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5 truncate">
          <MapPin size={11} className="shrink-0" /> {activity.local}
        </p>
        {activity.descricao && <p className="text-xs text-ink-400 mt-1 line-clamp-2">{activity.descricao}</p>}
        {canCheckin && (
          <div className="mt-2">
            {isCheckedIn ? (
              <span className="text-xs font-semibold text-quorum-500">✓ Check-in feito</span>
            ) : (
              <button
                onClick={onCheckin}
                disabled={isCheckingIn}
                className="text-xs font-semibold bg-quorum-500 disabled:opacity-50 text-ink-950 px-3 py-1.5 rounded-full"
              >
                {isCheckingIn ? "Verificando..." : "Fazer check-in"}
              </button>
            )}
          </div>
        )}
        {canCheckin && isCheckedIn && <ActivityRatingWidget activityId={activity.id} />}
      </div>
      {isCreator && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-full text-ink-400 hover:text-ink-100 hover:bg-ink-700/50"
            aria-label="Editar atividade"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(activity.id)}
            className="p-1.5 rounded-full text-ink-400 hover:text-red-400 hover:bg-ink-700/50"
            aria-label="Remover atividade"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export function ConferenceScheduleSection({
  eventId,
  isCreator,
  isCommitted,
}: {
  eventId: string;
  isCreator: boolean;
  isCommitted: boolean;
}) {
  const { data: activities, isLoading, createActivity, updateActivity, removeActivity, isSubmitting, error } =
    useConferenceActivities(eventId);
  const {
    isCheckedIn,
    checkin,
    checkingInId,
    error: checkinError,
  } = useActivityCheckins(eventId, activities ?? []);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const groups = groupByDay(activities ?? []);
  const canCheckin = isCommitted && !isCreator;

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <CalendarDays size={16} /> Programação
        </h3>
        {isCreator && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-coral-500"
          >
            <Plus size={14} /> Atividade
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-ink-400">Carregando...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {checkinError && <p className="text-sm text-red-400">{checkinError}</p>}

      {!isLoading && groups.length === 0 && !showCreateForm && (
        <p className="text-sm text-ink-500">
          {isCreator ? "Nenhuma atividade cadastrada ainda." : "A programação ainda não foi publicada."}
        </p>
      )}

      {groups.map(([day, dayActivities]) => (
        <div key={day} className="space-y-2">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">
            {format(new Date(`${day}T00:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="space-y-2">
            {dayActivities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                isCreator={isCreator}
                isSubmitting={isSubmitting}
                onUpdate={updateActivity}
                onDelete={setPendingDelete}
                canCheckin={canCheckin}
                isCheckedIn={isCheckedIn(activity.id)}
                isCheckingIn={checkingInId === activity.id}
                onCheckin={() => checkin(activity)}
              />
            ))}
          </div>
        </div>
      ))}

      {isCreator && showCreateForm && (
        <ActivityForm
          isSubmitting={isSubmitting}
          submitLabel="Adicionar"
          onCancel={() => setShowCreateForm(false)}
          onSubmit={(input) => createActivity(input)}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">Remover esta atividade?</h3>
              <button onClick={() => setPendingDelete(null)} aria-label="Fechar">
                <X size={18} className="text-ink-400" />
              </button>
            </div>
            <p className="text-sm text-ink-400">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  await removeActivity(pendingDelete);
                  setPendingDelete(null);
                }}
                className="flex-1 bg-red-500 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
