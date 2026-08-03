import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";
import { CATEGORY_OPTIONS } from "../components/CategoryBadge";
import { isValidQuorum, canReduceVagasTo } from "../../domain/services/QuorumService";
import type { EventCategory, EventModality } from "../../domain/entities/types";

const MODALITY_LABELS: Record<EventModality, string> = {
  estranhos: "Aberta a estranhos",
  amigos: "Só amigos (convite)",
  hibrida: "Amigos + vagas abertas",
  restrita: "Restrita (só por convite)",
};

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EditEventScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { event, quorum, isLoading } = useEventDetail(eventId);
  const { updateEvent, isSubmitting, error } = useManageMyEvent();
  const [validationError, setValidationError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [categoria, setCategoria] = useState<EventCategory>("esporte");
  const [modalidade, setModalidade] = useState<EventModality>("estranhos");
  const [vagasTotal, setVagasTotal] = useState(5);
  const [quorumMinimo, setQuorumMinimo] = useState(3);

  useEffect(() => {
    if (event) {
      setTitulo(event.titulo);
      setDescricao(event.descricao);
      setEndereco(event.local.endereco);
      setDataHora(toDatetimeLocalValue(event.dataHora));
      setCategoria(event.categoria);
      setModalidade(event.modalidade);
      setVagasTotal(event.vagasTotal);
      setQuorumMinimo(event.quorumMinimo);
    }
  }, [event]);

  if (isLoading || !event || !quorum) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!canReduceVagasTo(vagasTotal, quorum.vagasConfirmadas)) {
      setValidationError(
        `Já existem ${quorum.vagasConfirmadas} pessoas confirmadas — não é possível reduzir para menos que isso.`
      );
      return;
    }
    if (!isValidQuorum(quorumMinimo, vagasTotal)) {
      setValidationError("O quórum mínimo não pode ser maior que o total de vagas.");
      return;
    }

    const updated = await updateEvent(event.id, {
      titulo,
      descricao,
      endereco,
      dataHoraISO: new Date(dataHora).toISOString(),
      categoria,
      modalidade,
      vagasTotal,
      quorumMinimo,
    });
    if (updated) navigate(`/eventos/${event.id}`);
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-10">
      <header className="sticky top-0 z-20 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-300 hover:text-ink-100">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display font-semibold">Editar proposta</h1>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-400 mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoria(opt.value)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                    categoria === opt.value
                      ? "border-coral-500 bg-coral-500/10 text-ink-100"
                      : "border-ink-700 text-ink-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-2">Modalidade</label>
            <div className="space-y-2">
              {(Object.keys(MODALITY_LABELS) as EventModality[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidade(m)}
                  className={`w-full p-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                    modalidade === m
                      ? "border-coral-500 bg-coral-500/10 text-ink-100"
                      : "border-ink-700 text-ink-400"
                  }`}
                >
                  {MODALITY_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">Data e horário</label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">Local</label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">
              Total de vagas ({quorum.vagasConfirmadas} já confirmadas)
            </label>
            <input
              type="number"
              min={quorum.vagasConfirmadas || 1}
              max={200}
              value={vagasTotal}
              onChange={(e) => setVagasTotal(Number(e.target.value))}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">Quórum mínimo</label>
            <input
              type="number"
              min={1}
              max={vagasTotal}
              value={quorumMinimo}
              onChange={(e) => setQuorumMinimo(Number(e.target.value))}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
            <p className="text-xs text-ink-500 mt-1">
              Se o novo quórum já tiver sido atingido pelas confirmações atuais, o chat libera
              na hora.
            </p>
          </div>

          {(validationError || error) && (
            <p className="text-sm text-red-400">{validationError || error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </main>
    </div>
  );
}
