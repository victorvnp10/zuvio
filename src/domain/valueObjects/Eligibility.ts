import type { GeoPoint } from "../entities/types";

/**
 * Domínio: Elegibilidade de idade.
 *
 * A data de nascimento nunca é exibida publicamente (seção 11) — só
 * usada aqui para decidir elegibilidade e, em outro ponto do domínio,
 * para segmentação por faixa etária (nunca por nome/data exata).
 */
export const MINIMUM_AGE = 18;

export const calculateAge = (dataNascimentoISO: string, todayISO: string): number => {
  const birth = new Date(dataNascimentoISO);
  const today = new Date(todayISO);
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
};

export const isOfMinimumAge = (dataNascimentoISO: string, todayISO: string): boolean =>
  calculateAge(dataNascimentoISO, todayISO) >= MINIMUM_AGE;

/**
 * Um perfil vindo de login com Google pode nascer sem data de
 * nascimento nem localização (o Google não fornece isso) — a
 * aplicação usa esta checagem para decidir se leva a pessoa para a
 * tela de completar perfil antes de liberar o resto do app.
 */
export const isProfileComplete = (profile: {
  dataNascimento: string | null;
  localizacaoBase: string | null;
}): boolean => Boolean(profile.dataNascimento && profile.localizacaoBase);

/**
 * Domínio: Validação de check-in geolocalizado.
 *
 * Distância em metros pela fórmula de Haversine — sem dependência de
 * nenhuma API de mapas, só matemática pura.
 */
const EARTH_RADIUS_METERS = 6371000;
export const CHECKIN_RADIUS_METERS = 100;
export const CHECKIN_WINDOW_MINUTES_BEFORE = 30;
export const CHECKIN_WINDOW_MINUTES_AFTER = 180;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceInMeters = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
};

/** Extraída de `evaluateCheckinEligibility` para reuso no check-in de
 * eventos sem geolocalização salva (onde só a janela de horário se
 * aplica — não há como validar raio sem coordenadas do local). */
export const isWithinCheckinWindow = (eventDateTimeISO: string, nowISO: string): boolean => {
  const eventTime = new Date(eventDateTimeISO).getTime();
  const now = new Date(nowISO).getTime();
  const minutesDiff = (now - eventTime) / (1000 * 60);
  return minutesDiff >= -CHECKIN_WINDOW_MINUTES_BEFORE && minutesDiff <= CHECKIN_WINDOW_MINUTES_AFTER;
};

export interface CheckinEligibility {
  isWithinRadius: boolean;
  isWithinTimeWindow: boolean;
  isEligible: boolean;
  distanceMeters: number;
}

export const evaluateCheckinEligibility = ({
  userLocation,
  eventLocation,
  eventDateTimeISO,
  nowISO,
}: {
  userLocation: GeoPoint;
  eventLocation: GeoPoint;
  eventDateTimeISO: string;
  nowISO: string;
}): CheckinEligibility => {
  const distanceMeters = distanceInMeters(userLocation, eventLocation);
  const isWithinRadius = distanceMeters <= CHECKIN_RADIUS_METERS;
  const isWithinTimeWindow = isWithinCheckinWindow(eventDateTimeISO, nowISO);

  return {
    isWithinRadius,
    isWithinTimeWindow,
    isEligible: isWithinRadius && isWithinTimeWindow,
    distanceMeters,
  };
};

/**
 * Check-in de atividade de conferência — janela mais curta que a do
 * evento (que é de horas): a atividade já tem início e fim próprios,
 * então o check-in fica atrelado a eles, não a um único instante.
 */
export const ACTIVITY_CHECKIN_WINDOW_MINUTES_BEFORE = 15;
export const ACTIVITY_CHECKIN_WINDOW_MINUTES_AFTER_END = 30;

export const isWithinActivityCheckinWindow = (
  activityStartISO: string,
  activityEndISO: string,
  nowISO: string
): boolean => {
  const start = new Date(activityStartISO).getTime();
  const end = new Date(activityEndISO).getTime();
  const now = new Date(nowISO).getTime();
  return (
    now >= start - ACTIVITY_CHECKIN_WINDOW_MINUTES_BEFORE * 60_000 &&
    now <= end + ACTIVITY_CHECKIN_WINDOW_MINUTES_AFTER_END * 60_000
  );
};

export const evaluateActivityCheckinEligibility = ({
  userLocation,
  activityLocation,
  activityStartISO,
  activityEndISO,
  nowISO,
}: {
  userLocation: GeoPoint;
  activityLocation: GeoPoint;
  activityStartISO: string;
  activityEndISO: string;
  nowISO: string;
}): CheckinEligibility => {
  const distanceMeters = distanceInMeters(userLocation, activityLocation);
  const isWithinRadius = distanceMeters <= CHECKIN_RADIUS_METERS;
  const isWithinTimeWindow = isWithinActivityCheckinWindow(activityStartISO, activityEndISO, nowISO);

  return {
    isWithinRadius,
    isWithinTimeWindow,
    isEligible: isWithinRadius && isWithinTimeWindow,
    distanceMeters,
  };
};
