import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { AppShell } from "../layout/AppShell";
import { useGroups } from "../../application/hooks/useGroups";

export function GroupsScreen() {
  const navigate = useNavigate();
  const { groups, isLoading, error, createGroup } = useGroups();
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!nome.trim()) return;
    setIsSubmitting(true);
    const group = await createGroup(nome.trim());
    setIsSubmitting(false);
    if (group) {
      setNome("");
      setCreating(false);
      navigate(`/grupos/${group.id}`);
    }
  };

  return (
    <AppShell
      title="Grupos"
      headerAction={
        <button
          onClick={() => setCreating((v) => !v)}
          className="p-2 text-ink-300 hover:text-ink-100"
          aria-label="Criar grupo"
        >
          <Plus size={20} />
        </button>
      }
    >
      <p className="text-sm text-ink-400 mb-4">
        Grupos são compartilhados entre várias pessoas, como no WhatsApp — quem cria é o
        administrador e pode adicionar ou remover membros a qualquer momento.
      </p>

      {creating && (
        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 mb-4 space-y-3">
          <input
            autoFocus
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nome do grupo (ex.: Pedal de sábado)"
            className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2 rounded-xl text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !nome.trim()}
              className="flex-1 bg-coral-500 disabled:opacity-50 text-ink-950 font-semibold py-2 rounded-xl text-sm"
            >
              {isSubmitting ? "Criando..." : "Criar"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {isLoading && <p className="text-ink-400">Carregando...</p>}

      {!isLoading && groups.length === 0 && !creating && (
        <p className="text-sm text-ink-500">
          Você ainda não participa de nenhum grupo. Toque no "+" para criar o primeiro.
        </p>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => navigate(`/grupos/${group.id}`)}
            className="w-full flex items-center gap-3 bg-ink-800/60 border border-ink-700 rounded-2xl p-4 text-left"
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-ink-600 to-ink-800 flex items-center justify-center shrink-0">
              <Users size={20} className="text-ink-200" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-ink-100 truncate">{group.nome}</p>
              {group.descricao && (
                <p className="text-xs text-ink-500 truncate">{group.descricao}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
