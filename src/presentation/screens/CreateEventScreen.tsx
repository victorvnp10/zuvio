import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { CATEGORY_OPTIONS } from "../components/CategoryBadge";
import { useCreateEvent } from "../../application/hooks/useCreateEvent";
import type { EventCategory, EventModality } from "../../domain/entities/types";

const MODALITY_LABELS: Record<EventModality, string> = {
  estranhos: "Aberta a estranhos",
  amigos: "Só amigos (convite)",
  hibrida: "Amigos + vagas abertas",
  restrita: "Restrita (só por convite)",
};

const STEPS = ["Categoria", "Data e local", "Vagas e quórum"] as const;

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
  const [vagasTotal, setVagasTotal] = useState(5);
  const [quorumMinimo, setQuorumMinimo] = useState(3);

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
      geo: null, // geolocalização precisa: capturar via mapa/GPS numa iteração futura
      modalidade,
      vagasTotal,
      quorumMinimo,
    });
    if (event) navigate(`/eventos/${event.id}`);
  };

  return (
    <AppShell title="Criar proposta">
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1 rounded-full ${i <= step ? "bg-coral-500" : "bg-ink-700"}`}
            />
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
            <p className="text-xs text-ink-500 mt-1">
              Coordenadas de mapa para check-in geolocalizado entram numa próxima etapa —
              por ora o check-in fica disponível assim que o local tiver coordenadas.
            </p>
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
