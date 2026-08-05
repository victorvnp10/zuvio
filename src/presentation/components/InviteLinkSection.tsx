import { useEffect, useState } from "react";
import { InvitesRepository } from "../../infrastructure/supabase/repositories/InvitesRepository";
import { ShareLinkSection } from "./ShareLinkSection";

export function InviteLinkSection({ eventId }: { eventId: string }) {
  const [codigo, setCodigo] = useState<string | null>(null);

  useEffect(() => {
    InvitesRepository.getForEvent(eventId).then((invite) => {
      if (invite) setCodigo(invite.codigo);
    });
  }, [eventId]);

  if (!codigo) return null;

  const link = `${window.location.origin}/convite/${codigo}`;

  return (
    <ShareLinkSection
      link={link}
      title="Link de convite"
      message="Quem abrir esse link entra direto no evento (cadastra-se antes, se ainda não tiver conta)."
    />
  );
}
