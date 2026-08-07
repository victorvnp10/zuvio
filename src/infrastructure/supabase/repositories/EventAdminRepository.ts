import { supabase } from "../client";
import { toCertificateEligibility, toEventParticipantAdmin } from "../mappers";
import type { CertificateEligibility, EventParticipantAdmin } from "../../../domain/entities/types";

export const EventAdminRepository = {
  /** Roster completo do evento (qualquer status), com e-mail — só o
   * organizador do evento consegue chamar (ver migração 0041). */
  async listParticipants(eventId: string): Promise<EventParticipantAdmin[]> {
    const { data, error } = await supabase.rpc("list_event_participants", {
      p_event_id: eventId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toEventParticipantAdmin);
  },

  /** Percentual de presença + elegibilidade de certificado por
   * participante — calculado sob demanda, nunca armazenado (ver
   * migração 0042). */
  async getCertificateEligibility(eventId: string): Promise<CertificateEligibility[]> {
    const { data, error } = await supabase.rpc("get_certificate_eligibility", {
      p_event_id: eventId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCertificateEligibility);
  },
};
