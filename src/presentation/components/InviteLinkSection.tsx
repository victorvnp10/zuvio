import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { InvitesRepository } from "../../infrastructure/supabase/repositories/InvitesRepository";

export function InviteLinkSection({ eventId }: { eventId: string }) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    InvitesRepository.getForEvent(eventId).then((invite) => {
      if (invite) setCodigo(invite.codigo);
    });
  }, [eventId]);

  if (!codigo) return null;

  const link = `${window.location.origin}/convite/${codigo}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
      <h3 className="font-display font-semibold">Link de convite</h3>
      <p className="text-sm text-ink-400">
        Envie este link no WhatsApp — quem abrir, cadastra-se (ou entra, se já tiver conta) e
        ganha acesso direto ao evento.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-xs text-ink-300"
        />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-coral-500 text-ink-950 px-3 rounded-lg"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
