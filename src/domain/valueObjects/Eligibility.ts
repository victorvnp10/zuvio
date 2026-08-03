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

  const eventTime = new Date(eventDateTimeISO).getTime();
  const now = new Date(nowISO).getTime();
  const minutesDiff = (now - eventTime) / (1000 * 60);
  const isWithinTimeWindow =
    minutesDiff >= -CHECKIN_WINDOW_MINUTES_BEFORE && minutesDiff <= CHECKIN_WINDOW_MINUTES_AFTER;

  return {
    isWithinRadius,
    isWithinTimeWindow,
    isEligible: isWithinRadius && isWithinTimeWindow,
    distanceMeters,
  };
};
