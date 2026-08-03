import { useEffect, useRef, useState } from "react";
import { useChat } from "../../application/hooks/useChat";
import { useAuth } from "../../application/context/AuthContext";

export function ChatPanel({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const { messages, isLoading, isSending, error, sendMessage } = useChat(eventId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await sendMessage(draft);
    setDraft("");
  };

  return (
    <div className="bg-ink-800/60 border border-quorum-500/30 rounded-2xl overflow-hidden">
      <div className="bg-quorum-500/10 px-4 py-2.5 flex items-center gap-2 border-b border-quorum-500/20">
        <span className="text-quorum-500">🔓</span>
        <p className="text-sm font-semibold text-quorum-500">
          Quórum atingido — o grupo já pode combinar os detalhes
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto p-4 space-y-2">
        {isLoading && <p className="text-sm text-ink-500">Carregando mensagens...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-ink-500 text-center py-4">
            Sejam os primeiros a combinar os detalhes por aqui.
          </p>
        )}
        {messages.map((message) => {
          const isMine = message.autorId === user?.id;
          return (
            <div
              key={message.id}
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                isMine
                  ? "ml-auto bg-coral-500 text-ink-950"
                  : "bg-ink-700 text-ink-100"
              }`}
            >
              {message.texto}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-ink-700">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 bg-ink-900 border border-ink-700 rounded-xl px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="bg-coral-500 disabled:opacity-50 text-ink-950 font-semibold px-4 rounded-xl text-sm"
        >
          Enviar
        </button>
      </form>
      {error && <p className="text-xs text-red-400 px-4 pb-3">{error}</p>}
    </div>
  );
}
