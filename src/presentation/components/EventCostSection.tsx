import { useState } from "react";
import { ExternalLink, Check } from "lucide-react";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { computeRateioPerPerson } from "../../domain/services/EventTypeService";
import type { Commitment, EventProposal } from "../../domain/entities/types";

export function EventCostSection({
  event,
  eventId,
  myCommitment,
  commitments,
  onPaymentConfirmed,
}: {
  event: EventProposal;
  eventId: string;
  myCommitment: Commitment | null;
  commitments: Commitment[];
  onPaymentConfirmed: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (event.tipoEvento === "pago") {
    const jaConfirmou = myCommitment?.pagamentoConfirmado;

    const handleConfirm = async () => {
      setIsConfirming(true);
      try {
        await CommitmentsRepository.confirmPayment(eventId);
        onPaymentConfirmed();
      } finally {
        setIsConfirming(false);
      }
    };

    return (
      <div className="bg-ink-800/60 border border-amber-500/30 rounded-2xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-amber-500">Entrada paga</h3>
        <p className="text-2xl font-display font-semibold">
          R$ {event.valorEntrada?.toFixed(2)}
        </p>
        {event.linkPagamento && (
          <a
            href={event.linkPagamento}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-coral-500 font-semibold"
          >
            Pagar agora <ExternalLink size={14} />
          </a>
        )}
        {myCommitment && !jaConfirmou && (
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full bg-amber-500 disabled:opacity-50 text-ink-950 font-semibold py-2 rounded-xl text-sm"
          >
            Já paguei
          </button>
        )}
        {jaConfirmou && (
          <p className="text-sm text-quorum-500 flex items-center gap-1">
            <Check size={14} /> Pagamento confirmado — apresente o comprovante na entrada.
          </p>
        )}
        <p className="text-xs text-ink-500">
          O app não processa o pagamento — só guarda o link. Leve o comprovante para a entrada.
        </p>
      </div>
    );
  }

  if (event.tipoEvento === "colaborativo" && event.modoCustoColaborativo !== "nenhum") {
    const checkins = commitments.filter((c) => c.status === "check-in").length;

    return (
      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-2">
        <h3 className="font-display font-semibold">Custo</h3>
        {event.modoCustoColaborativo === "valor_fixo_por_pessoa" && (
          <p className="text-sm text-ink-300">
            <span className="text-xl font-display font-semibold text-ink-100">
              R$ {event.valorPorPessoa?.toFixed(2)}
            </span>{" "}
            por pessoa
          </p>
        )}
        {event.modoCustoColaborativo === "rateio_entre_presentes" && (
          <>
            <p className="text-sm text-ink-400">
              Total a ratear: R$ {event.valorTotalRateio?.toFixed(2)}
            </p>
            {(() => {
              const perPerson = computeRateioPerPerson(event.valorTotalRateio!, checkins);
              return perPerson !== null ? (
                <p className="text-sm text-ink-300">
                  <span className="text-xl font-display font-semibold text-ink-100">
                    R$ {perPerson.toFixed(2)}
                  </span>{" "}
                  por pessoa (dividido entre {checkins} check-in{checkins === 1 ? "" : "s"} até agora)
                </p>
              ) : (
                <p className="text-sm text-ink-500">
                  O valor por pessoa aparece assim que alguém fizer check-in.
                </p>
              );
            })()}
          </>
        )}
      </div>
    );
  }

  return null;
}
