import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { CATEGORY_OPTIONS } from "../components/CategoryBadge";
import { useCreateEvent } from "../../application/hooks/useCreateEvent";
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

const TIPO_EVENTO_LABELS: Record<TipoEvento, { label: string; description: string }> = {
  livre: {
    label: "Livre",
    description: "Sem cobrança pelo app — check-in e comprovante na entrada, se precisar.",
  },
  pago: {
    label: "Pago",
    description: "Valor de entrada fixo, com link de pagamento.",
  },
  colaborativo: {
    label: "Colaborativo",
    description: "Lista do que cada um vai levar, com custo opcional dividido entre todos.",
  },
};

const LISTA_COLABORATIVA_LABELS: Record<ModoListaColaborativa, string> = {
  predefinida: "Só eu defino os itens (participantes marcam o que vão levar)",
  livre: "Cada um escreve livremente o que vai levar",
  mista: "Mista (eu defino alguns, e qualquer um pode adicionar outros)",
};

const CUSTO_COLABORATIVO_LABELS: Record<ModoCustoColaborativo, string> = {
  nenhum: "Sem custo em dinheiro — só o que cada um levar",
  valor_fixo_por_pessoa: "Valor fixo por pessoa",
  rateio_entre_presentes: "Rateado entre quem comparecer (dividido no dia)",
};

const STEPS = ["Categoria", "Data e local", "Vagas e quórum", "Tipo de evento"] as const;

export function CreateEventScreen() {
  const navigate = useNavigate();
  const { createEvent, isSubmitting, error } = useCreateEvent();
  const [step, setStep] = useState(0);

  const [categoria, setCategoria] = useState<EventCategory>("esporte");
  const [modalidade, setModalidade] = useState<EventModality>("estranhos");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [endereco, setEndereco] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "capturing" | "done" | "error">("idle");
  const [vagasTotal, setVagasTotal] = useState(5);
  const [quorumMinimo, setQuorumMinimo] = useState(3);

  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("livre");
  const [valorEntrada, setValorEntrada] = useState<number>(0);
  const [linkPagamento, setLinkPagamento] = useState("");
  const [modoListaColaborativa, setModoListaColaborativa] = useState<ModoListaColaborativa>("predefinida");
  const [modoCustoColaborativo, setModoCustoColaborativo] = useState<ModoCustoColaborativo>("nenhum");
  const [valorPorPessoa, setValorPorPessoa] = useState<number>(0);
  const [valorTotalRateio, setValorTotalRateio] = useState<number>(0);

  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const event = await createEvent({
      categoria,
      titulo,
      descricao,
      dataHoraISO: new Date(dataHora).toISOString(),
      endereco,
      geo,
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
    });
    if (event) navigate(`/eventos/${event.id}`);
  };

  return (
    <AppShell title="Criar proposta">
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-coral-500" : "bg-ink-700"}`} />
            <p className={`text-xs mt-1 ${i === step ? "text-ink-100 font-semibold" : "text-ink-500"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink-400 mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
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
            <label className="block text-sm text-ink-400 mb-1">Título da proposta</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Pedal no Parque da Cidade"
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Do que se trata, o que levar, nível de experiência..."
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-400 mb-2">Modalidade</label>
            <div className="space-y-2">
              {(Object.keys(MODALITY_LABELS) as EventModality[]).map((m) => (
                <button
                  key={m}
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
            {modalidade === "hibrida" && (
              <p className="text-xs text-amber-500 mt-2">
                Modalidade Híbrida ainda não tem o fluxo completo de convite de amigos
                implementado nesta versão — a proposta será criada, mas funciona como
                "Aberta a estranhos" por enquanto.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
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
              placeholder="Endereço ou ponto de encontro"
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setGeoStatus("capturing");
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setGeo({ lat: position.coords.latitude, lng: position.coords.longitude });
                    setGeoStatus("done");
                  },
                  () => setGeoStatus("error"),
                  { enableHighAccuracy: true, timeout: 10_000 }
                );
              }}
              className="text-xs font-semibold text-coral-500 mt-2"
            >
              {geoStatus === "capturing" ? "Obtendo localização..." : "📍 Usar minha localização atual"}
            </button>
            {geoStatus === "done" && (
              <p className="text-xs text-quorum-500 mt-1">
                Localização capturada — o check-in geolocalizado vai funcionar neste evento.
              </p>
            )}
            {geoStatus === "error" && (
              <p className="text-xs text-red-400 mt-1">
                Não foi possível obter sua localização. Sem coordenadas, o check-in
                geolocalizado não ficará disponível neste evento (só o resto do fluxo).
              </p>
            )}
            {geoStatus === "idle" && (
              <p className="text-xs text-ink-500 mt-1">
                Sem coordenadas, o evento é criado normalmente, mas o check-in geolocalizado
                não fica disponível.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink-400 mb-1">Total de vagas</label>
            <input
              type="number"
              min={1}
              max={200}
              value={vagasTotal}
              onChange={(e) => {
                const value = Number(e.target.value);
                setVagasTotal(value);
                if (quorumMinimo > value) setQuorumMinimo(value);
              }}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1">
              Quórum mínimo (confirmações para liberar o chat)
            </label>
            <input
              type="number"
              min={1}
              max={vagasTotal}
              value={quorumMinimo}
              onChange={(e) => setQuorumMinimo(Number(e.target.value))}
              className="w-full bg-ink-800 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
            <p className="text-xs text-ink-500 mt-1">
              Ao atingir {quorumMinimo} de {vagasTotal} confirmações, o chat já libera —
              novas confirmações continuam entrando até completar as vagas.
            </p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink-400 mb-2">Tipo de evento</label>
            <div className="space-y-2">
              {(Object.keys(TIPO_EVENTO_LABELS) as TipoEvento[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoEvento(t)}
                  className={`w-full p-3 rounded-xl border text-left transition-colors ${
                    tipoEvento === t
                      ? "border-coral-500 bg-coral-500/10"
                      : "border-ink-700"
                  }`}
                >
                  <p className={`text-sm font-medium ${tipoEvento === t ? "text-ink-100" : "text-ink-300"}`}>
                    {TIPO_EVENTO_LABELS[t].label}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">{TIPO_EVENTO_LABELS[t].description}</p>
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
                  placeholder="https://..."
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
                />
                <p className="text-xs text-ink-500 mt-1">
                  O app só guarda e mostra este link — não processa pagamento nenhum. Quem
                  confirmar presença paga por aqui e apresenta o comprovante na entrada.
                </p>
              </div>
            </div>
          )}

          {tipoEvento === "colaborativo" && (
            <div className="space-y-4 bg-ink-800/40 border border-ink-700 rounded-xl p-4">
              <div>
                <label className="block text-sm text-ink-400 mb-2">Lista do que levar</label>
                <div className="space-y-2">
                  {(Object.keys(LISTA_COLABORATIVA_LABELS) as ModoListaColaborativa[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setModoListaColaborativa(m)}
                      className={`w-full p-2.5 rounded-lg border text-xs text-left transition-colors ${
                        modoListaColaborativa === m
                          ? "border-coral-500 bg-coral-500/10 text-ink-100"
                          : "border-ink-700 text-ink-400"
                      }`}
                    >
                      {LISTA_COLABORATIVA_LABELS[m]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  {modoListaColaborativa === "predefinida"
                    ? "Você adiciona os itens depois de criar o evento, na página dele."
                    : "Você ainda pode sugerir itens depois de criar o evento, além do que os participantes adicionarem."}
                </p>
              </div>

              <div>
                <label className="block text-sm text-ink-400 mb-2">Custo em dinheiro</label>
                <div className="space-y-2">
                  {(Object.keys(CUSTO_COLABORATIVO_LABELS) as ModoCustoColaborativo[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setModoCustoColaborativo(m)}
                      className={`w-full p-2.5 rounded-lg border text-xs text-left transition-colors ${
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
                <div>
                  <label className="block text-sm text-ink-400 mb-1">Valor por pessoa (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorPorPessoa}
                    onChange={(e) => setValorPorPessoa(Number(e.target.value))}
                    className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
                  />
                </div>
              )}

              {modoCustoColaborativo === "rateio_entre_presentes" && (
                <div>
                  <label className="block text-sm text-ink-400 mb-1">Valor total a ratear (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorTotalRateio}
                    onChange={(e) => setValorTotalRateio(Number(e.target.value))}
                    className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
                  />
                  <p className="text-xs text-ink-500 mt-1">
                    Dividido pelo número de pessoas que fizerem check-in de verdade — quem só
                    confirmou e não apareceu não entra na conta.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={handleBack}
            className="flex-1 border border-ink-600 text-ink-300 font-semibold py-3 rounded-xl"
          >
            Voltar
          </button>
        )}
        <button
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={isSubmitting || (step === 0 && !titulo) || (step === 1 && (!dataHora || !endereco))}
          className="flex-1 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-3 rounded-xl transition-colors"
        >
          {isSubmitting ? "Criando..." : isLastStep ? "Publicar proposta" : "Próximo"}
        </button>
      </div>
    </AppShell>
  );
}
