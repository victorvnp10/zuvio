import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EditEventScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { event, isLoading } = useEventDetail(eventId);
  const { updateEvent, isSubmitting, error } = useManageMyEvent();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataHora, setDataHora] = useState("");

  useEffect(() => {
    if (event) {
      setTitulo(event.titulo);
      setDescricao(event.descricao);
      setEndereco(event.local.endereco);
      setDataHora(toDatetimeLocalValue(event.dataHora));
    }
  }, [event]);

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateEvent(event.id, {
      titulo,
      descricao,
      endereco,
      dataHoraISO: new Date(dataHora).toISOString(),
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
          <p className="text-xs text-ink-500">
            Categoria, vagas, quórum e modalidade não podem ser alterados depois de criados —
            evita quebrar compromissos que já foram feitos com essas regras.
          </p>

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

          {error && <p className="text-sm text-red-400">{error}</p>}

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
