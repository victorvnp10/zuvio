import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, Trash2 } from "lucide-react";
import { useAnnouncements } from "../../application/hooks/useAnnouncements";
import { useAuth } from "../../application/context/AuthContext";

/**
 * Mural de avisos do organizador — diferente do chat: não depende do
 * quórum (funciona desde o evento aberto) e só o organizador escreve;
 * participantes só leem. Pensado pra "mudei o horário", "levem
 * casaco", esse tipo de recado que precisa chegar em todo mundo.
 */
export function AnnouncementsSection({
  eventId,
  isCreator,
}: {
  eventId: string;
  isCreator: boolean;
}) {
  const { user } = useAuth();
  const { announcements, isLoading, isPosting, error, postAnnouncement, removeAnnouncement } =
    useAnnouncements(eventId);
  const [draft, setDraft] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !user) return;
    await postAnnouncement(user.id, draft);
    setDraft("");
  };

  if (!isCreator && !isLoading && announcements.length === 0) return null;

  return (
    <div className="bg-ink-800/60 border border-amber-500/30 rounded-2xl overflow-hidden">
      <div className="bg-amber-500/10 px-4 py-2.5 flex items-center gap-2 border-b border-amber-500/20">
        <Megaphone size={16} className="text-amber-500" />
        <p className="text-sm font-semibold text-amber-500">Avisos do organizador</p>
      </div>

      {isCreator && (
        <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-b border-ink-700">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva um aviso para todo mundo..."
            maxLength={500}
            className="flex-1 bg-ink-900 border border-ink-700 rounded-xl px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPosting || !draft.trim()}
            className="bg-amber-500 disabled:opacity-50 text-ink-950 font-semibold px-4 rounded-xl text-sm"
          >
            Publicar
          </button>
        </form>
      )}

      <div className="max-h-72 overflow-y-auto divide-y divide-ink-700/60">
        {isLoading && <p className="text-sm text-ink-500 p-4">Carregando avisos...</p>}
        {!isLoading && announcements.length === 0 && (
          <p className="text-sm text-ink-500 p-4">Nenhum aviso publicado ainda.</p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-100">{a.texto}</p>
              <p className="text-xs text-ink-500 mt-1">
                {format(new Date(a.criadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {isCreator && (
              <button
                onClick={() => removeAnnouncement(a.id)}
                className="text-ink-500 hover:text-red-400 shrink-0"
                aria-label="Apagar aviso"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 px-4 pb-3">{error}</p>}
    </div>
  );
}
