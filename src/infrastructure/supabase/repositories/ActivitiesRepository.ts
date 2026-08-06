import { supabase } from "../client";
import { toActivityCheckin, toConferenceActivity } from "../mappers";
import type { ActivityCheckin, ConferenceActivity } from "../../../domain/entities/types";

export interface ActivityInput {
  titulo: string;
  descricao: string;
  local: string;
  geo?: { lat: number; lng: number } | null;
  capaUrl?: string | null;
  dataHoraInicioISO: string;
  dataHoraFimISO: string;
  ordem?: number;
}

export const ActivitiesRepository = {
  /** Programação completa de uma conferência, em ordem cronológica —
   * a tela agrupa por dia no cliente. */
  async listForEvent(eventId: string): Promise<ConferenceActivity[]> {
    const { data, error } = await supabase
      .from("conference_activities")
      .select("*")
      .eq("event_id", eventId)
      .order("data_hora_inicio", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toConferenceActivity);
  },

  async create(eventId: string, input: ActivityInput): Promise<ConferenceActivity> {
    const { data, error } = await supabase
      .from("conference_activities")
      .insert({
        event_id: eventId,
        titulo: input.titulo,
        descricao: input.descricao,
        local: input.local,
        geo_lat: input.geo?.lat ?? null,
        geo_lng: input.geo?.lng ?? null,
        capa_url: input.capaUrl ?? null,
        data_hora_inicio: input.dataHoraInicioISO,
        data_hora_fim: input.dataHoraFimISO,
        ordem: input.ordem ?? 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toConferenceActivity(data);
  },

  async update(activityId: string, input: Partial<ActivityInput>): Promise<ConferenceActivity> {
    const patch: Record<string, unknown> = {};
    if (input.titulo !== undefined) patch.titulo = input.titulo;
    if (input.descricao !== undefined) patch.descricao = input.descricao;
    if (input.local !== undefined) patch.local = input.local;
    if (input.capaUrl !== undefined) patch.capa_url = input.capaUrl;
    if (input.dataHoraInicioISO !== undefined) patch.data_hora_inicio = input.dataHoraInicioISO;
    if (input.dataHoraFimISO !== undefined) patch.data_hora_fim = input.dataHoraFimISO;
    if (input.ordem !== undefined) patch.ordem = input.ordem;
    if (input.geo !== undefined) {
      patch.geo_lat = input.geo?.lat ?? null;
      patch.geo_lng = input.geo?.lng ?? null;
    }

    const { data, error } = await supabase
      .from("conference_activities")
      .update(patch)
      .eq("id", activityId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toConferenceActivity(data);
  },

  async remove(activityId: string): Promise<void> {
    const { error } = await supabase.from("conference_activities").delete().eq("id", activityId);
    if (error) throw new Error(error.message);
  },

  /** Check-in numa atividade específica — `lat`/`lng` ficam de fora
   * quando ela não tem geolocalização salva (mesmo fallback do
   * check-in de evento). Idempotente: clicar de novo não dá erro. */
  async checkin(activityId: string, lat: number | null, lng: number | null): Promise<ActivityCheckin> {
    const { data, error } = await supabase.rpc("checkin_activity", {
      p_activity_id: activityId,
      p_lat: lat,
      p_lng: lng,
    });
    if (error) throw new Error(error.message);
    return toActivityCheckin(data);
  },

  /** Meus check-ins entre um conjunto de atividades — usado pra saber
   * quais já têm check-in feito na tela da programação. */
  async listMyCheckins(activityIds: string[], userId: string): Promise<ActivityCheckin[]> {
    if (activityIds.length === 0) return [];
    const { data, error } = await supabase
      .from("activity_checkins")
      .select("*")
      .in("activity_id", activityIds)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toActivityCheckin);
  },
};
