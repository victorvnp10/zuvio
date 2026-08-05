/**
 * Domínio: rótulo de urgência/contagem regressiva de um evento.
 *
 * Puro — não depende de nada além das duas datas recebidas.
 */
export const getCountdownLabel = (dataHoraISO: string, nowISO: string): string => {
  const eventTime = new Date(dataHoraISO).getTime();
  const now = new Date(nowISO).getTime();
  const diffMs = eventTime - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMs < 0 && diffHours > -3) return "AGORA";
  if (diffMs < 0) return "Já rolou";
  if (diffHours < 3) return "AGORA";
  if (diffHours < 24) return "HOJE";
  if (diffHours < 48) return "amanhã";

  const diffDays = Math.ceil(diffHours / 24);
  return `faltam ${diffDays}d`;
};

/** Verdadeiro quando o evento é hoje ou já está rolando — usado para destacar o selo. */
export const isUrgent = (dataHoraISO: string, nowISO: string): boolean => {
  const diffHours = (new Date(dataHoraISO).getTime() - new Date(nowISO).getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
};
