import type { ModoCustoColaborativo, TipoEvento } from "../entities/types";

/**
 * Domínio: validação e cálculo dos tipos de evento.
 *
 *  - "livre": sem cobrança pelo app — check-in + comprovante mostrado
 *    na entrada, fora do app.
 *  - "pago": tem valor de entrada fixo e um link de pagamento externo
 *    (o app não processa pagamento, só guarda e mostra o link).
 *  - "colaborativo": tem uma lista do que cada um vai levar, e
 *    opcionalmente um custo dividido entre os participantes (valor
 *    fixo por pessoa, ou rateado pelo total de quem compareceu de
 *    verdade — não quem só confirmou).
 */

export interface EventTypeInput {
  tipoEvento: TipoEvento;
  valorEntrada?: number | null;
  linkPagamento?: string | null;
  modoCustoColaborativo?: ModoCustoColaborativo | null;
  valorPorPessoa?: number | null;
  valorTotalRateio?: number | null;
}

export const validateEventType = (input: EventTypeInput): string | null => {
  if (input.tipoEvento === "pago") {
    if (!input.valorEntrada || input.valorEntrada <= 0) {
      return "Informe o valor da entrada.";
    }
    if (!input.linkPagamento?.trim()) {
      return "Informe o link de pagamento.";
    }
  }

  if (input.tipoEvento === "colaborativo") {
    if (input.modoCustoColaborativo === "valor_fixo_por_pessoa") {
      if (!input.valorPorPessoa || input.valorPorPessoa <= 0) {
        return "Informe o valor por pessoa.";
      }
    }
    if (input.modoCustoColaborativo === "rateio_entre_presentes") {
      if (!input.valorTotalRateio || input.valorTotalRateio <= 0) {
        return "Informe o valor total a ser rateado.";
      }
    }
  }

  return null;
};

/**
 * Valor por pessoa no rateio — calculado sobre quem de fato compareceu
 * (check-in), nunca sobre quem só confirmou presença e não apareceu.
 * Retorna `null` quando ainda não há ninguém para dividir (evita
 * divisão por zero antes do evento acontecer).
 */
export const computeRateioPerPerson = (
  valorTotalRateio: number,
  quantidadeCheckins: number
): number | null => {
  if (quantidadeCheckins <= 0) return null;
  return Math.round((valorTotalRateio / quantidadeCheckins) * 100) / 100;
};
