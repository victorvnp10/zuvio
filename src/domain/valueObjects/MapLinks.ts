import type { EventProposal } from "../entities/types";

/** Prioriza coordenadas (mais preciso, abre direto no pino) e cai para
 * o texto do endereço quando o evento não tem geolocalização salva. */
export function buildMapLinks(local: EventProposal["local"]): { googleMaps: string; waze: string } {
  const encodedEndereco = encodeURIComponent(local.endereco);
  const coords = local.geo ? `${local.geo.lat},${local.geo.lng}` : null;

  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${coords ?? encodedEndereco}`,
    waze: coords
      ? `https://waze.com/ul?ll=${coords}&navigate=yes`
      : `https://waze.com/ul?q=${encodedEndereco}&navigate=yes`,
  };
}
