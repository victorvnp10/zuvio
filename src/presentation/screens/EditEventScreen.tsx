import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";
import { useEventCover } from "../../application/hooks/useEventCover";
import { CATEGORY_OPTIONS } from "../components/CategoryBadge";
import { isValidQuorum, canReduceVagasTo } from "../../domain/services/QuorumService";
import { validateEventType } from "../../domain/services/EventTypeService";
import type {
  EventCategory,
  EventModality,
  ModoCustoColaborativo,
  ModoListaColaborativa,
  TipoEvento,
} from "../../domain/entities/types";

const MODALITY_LABELS: Record<EventModality, string> = {
  estranhos: "Aberta a estranhos",
  amigos: "Só amigos (convite)",
  hibrida: "Amigos + vagas abertas",
  restrita: "Restrita (só por convite)",
};

const TIPO_EVENTO_LABELS: Record<TipoEvento, string> = {
  livre: "Livre",
  pago: "Pago",
  colaborativo: "Colaborativo",
};

const LISTA_COLABORATIVA_LABELS: Record<ModoListaColaborativa, string> = {
  predefinida: "Só o organizador define os itens",
  livre: "Cada um escreve o que vai levar",
  mista: "Mista (predefinidos + livres)",
};

const CUSTO_COLABORATIVO_LABELS: Record<ModoCustoColaborativo, string> = {
  nenhum: "Sem custo em dinheiro",
  valor_fixo_por_pessoa: "Valor fixo por pessoa",
  rateio_entre_presentes: "Rateado entre quem comparecer",
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
  const { uploadCover, isUploading: isUploadingCover, error: coverError } = useEventCover(
    eventId ?? ""
  );
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

  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("livre");
  const [valorEntrada, setValorEntrada] = useState(0);
  const [linkPagamento, setLinkPagamento] = useState("");
  const [modoListaColaborativa, setModoListaColaborativa] = useState<ModoListaColaborativa>("predefinida");
  const [modoCustoColaborativo, setModoCustoColaborativo] = useState<ModoCustoColaborativo>("nenhum");
  const [valorPorPessoa, setValorPorPessoa] = useState(0);
  const [valorTotalRateio, setValorTotalRateio] = useState(0);
  const [fotosPublicas, setFotosPublicas] = useState(false);

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
      setTipoEvento(event.tipoEvento);
      setValorEntrada(event.valorEntrada ?? 0);
      setLinkPagamento(event.linkPagamento ?? "");
      setModoListaColaborativa(event.modoListaColaborativa ?? "predefinida");
      setModoCustoColaborativo(event.modoCustoColaborativo ?? "nenhum");
      setValorPorPessoa(event.valorPorPessoa ?? 0);
      setValorTotalRateio(event.valorTotalRateio ?? 0);
      setFotosPublicas(event.fotosPublicas);
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
    const eventTypeError = validateEventType({
      tipoEvento,
      valorEntrada,
      linkPagamento,
      modoCustoColaborativo,
      valorPorPessoa,
      valorTotalRateio,
    });
    if (eventTypeError) {
      setValidationError(eventTypeError);
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
      tipoEvento,
      valorEntrada: tipoEvento === "pago" ? valorEntrada : null,
      linkPagamento: tipoEvento === "pago" ? linkPagamento : null,
      modoListaColaborativa: tipoEvento === "colaborativo" ? modoListaColaborativa : null,
      modoCustoColaborativo: tipoEvento === "colaborativo" ? modoCustoColaborativo : null,
      valorPorPessoa:
        tipoEvento === "colaborativo" && modoCustoColaborativo === "valor_fixo_por_pessoa"
          ? valorPorPessoa
          : null,
      valorTotalRateio:
        tipoEvento === "colaborativo" && modoCustoColaborativo === "rateio_entre_presentes"
          ? valorTotalRateio
          : null,
      fotosPublicas,
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
            <label className="block text-sm text-ink-400 mb-2">Capa do evento</label>
            <div
              className="relative h-32 rounded-xl overflow-hidden bg-ink-800 border border-ink-700 flex items-center justify-center"
              style={
                event.capaUrl
                  ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            >
              {!event.capaUrl && (
                <span className="text-sm text-ink-500">Sem capa — usando o padrão da categoria</span>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-ink-950/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-sm font-semibold text-white">
                  {isUploadingCover ? "Enviando..." : "Trocar capa"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingCover}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadCover(file);
                  }}
                />
              </label>
            </div>
            {coverError && <p className="text-xs text-red-400 mt-1">{coverError}</p>}
          </div>

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

          <div className="border-t border-ink-700 pt-4">
            <label className="block text-sm text-ink-400 mb-2">Tipo de evento</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TIPO_EVENTO_LABELS) as TipoEvento[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoEvento(t)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                    tipoEvento === t
                      ? "border-coral-500 bg-coral-500/10 text-ink-100"
                      : "border-ink-700 text-ink-400"
                  }`}
                >
                  {TIPO_EVENTO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {tipoEvento === "pago" && (
            <div className="space-y-3 bg-ink-800/40 border border-ink-700 rounded-xl p-4">
              <div>
                <label className="block text-sm text-ink-400 mb-1">Valor da entrada (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorEntrada}
                  onChange={(e) => setValorEntrada(Number(e.target.value))}
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-ink-400 mb-1">Link de pagamento</label>
                <input
                  type="url"
                  value={linkPagamento}
                  onChange={(e) => setLinkPagamento(e.target.value)}
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {tipoEvento === "colaborativo" && (
            <div className="space-y-3 bg-ink-800/40 border border-ink-700 rounded-xl p-4">
              <div>
                <label className="block text-sm text-ink-400 mb-2">Lista do que levar</label>
                <div className="space-y-2">
                  {(Object.keys(LISTA_COLABORATIVA_LABELS) as ModoListaColaborativa[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModoListaColaborativa(m)}
                      className={`w-full p-2 rounded-lg border text-xs text-left transition-colors ${
                        modoListaColaborativa === m
                          ? "border-coral-500 bg-coral-500/10 text-ink-100"
                          : "border-ink-700 text-ink-400"
                      }`}
                    >
                      {LISTA_COLABORATIVA_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-ink-400 mb-2">Custo em dinheiro</label>
                <div className="space-y-2">
                  {(Object.keys(CUSTO_COLABORATIVO_LABELS) as ModoCustoColaborativo[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModoCustoColaborativo(m)}
                      className={`w-full p-2 rounded-lg border text-xs text-left transition-colors ${
                        modoCustoColaborativo === m
                          ? "border-coral-500 bg-coral-500/10 text-ink-100"
                          : "border-ink-700 text-ink-400"
                      }`}
                    >
                      {CUSTO_COLABORATIVO_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {modoCustoColaborativo === "valor_fixo_por_pessoa" && (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorPorPessoa}
                  onChange={(e) => setValorPorPessoa(Number(e.target.value))}
                  placeholder="Valor por pessoa (R$)"
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
                />
              )}

              {modoCustoColaborativo === "rateio_entre_presentes" && (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorTotalRateio}
                  onChange={(e) => setValorTotalRateio(Number(e.target.value))}
                  placeholder="Valor total a ratear (R$)"
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-ink-400 mb-2">Fotos do evento</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setFotosPublicas(false)}
                className={`w-full p-3 rounded-xl border text-left transition-colors ${
                  !fotosPublicas ? "border-coral-500 bg-coral-500/10" : "border-ink-700"
                }`}
              >
                <p className={`text-sm font-medium ${!fotosPublicas ? "text-ink-100" : "text-ink-300"}`}>
                  Só para participantes
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Só quem confirmou presença (e você) vê as fotos postadas.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFotosPublicas(true)}
                className={`w-full p-3 rounded-xl border text-left transition-colors ${
                  fotosPublicas ? "border-coral-500 bg-coral-500/10" : "border-ink-700"
                }`}
              >
                <p className={`text-sm font-medium ${fotosPublicas ? "text-ink-100" : "text-ink-300"}`}>
                  Visíveis para todos
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Aparecem no feed principal — quem passar o dedo na capa vê as fotos, tipo
                  reels, mesmo sem participar.
                </p>
              </button>
            </div>
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
