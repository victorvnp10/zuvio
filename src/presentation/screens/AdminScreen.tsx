import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../layout/AppShell";
import { AdminRepository } from "../../infrastructure/supabase/repositories/AdminRepository";
import { useAdminCategories } from "../../application/hooks/useAdminCategories";

/** Conjunto curado — cobre os temas mais comuns de evento sem virar um
 * seletor de emoji genérico (a categoria é sobre o tipo de atividade,
 * não "qualquer emoji que exista"). */
const ICON_OPTIONS = [
  "🏃", "⚽", "🏀", "🎾", "🏊", "🚴", "🧘", "🏕️",
  "✈️", "🌊", "🎨", "🎭", "🎬", "🎮", "🎵", "🎤",
  "☕", "🍜", "🍕", "🍻", "📚", "💻", "🛍️", "🐾",
  "🌱", "🎲", "📷", "💃", "🎉", "✨",
];

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-16 h-[52px] bg-ink-900 border border-ink-700 rounded-xl text-center text-lg hover:border-coral-500"
        aria-label="Escolher ícone"
      >
        {value}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full left-0 mt-2 w-64 bg-ink-800 border border-ink-700 rounded-xl p-2 grid grid-cols-6 gap-1 shadow-xl">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                }}
                className={`text-lg p-1.5 rounded-lg hover:bg-ink-700 ${
                  icon === value ? "bg-coral-500/20 ring-1 ring-coral-500" : ""
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
      <p className="text-2xl font-display font-bold text-ink-100">{value}</p>
      <p className="text-xs text-ink-400 mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

function StatsSection() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => AdminRepository.getDashboardStats(),
    staleTime: 60_000,
  });

  if (isLoading) return <p className="text-sm text-ink-400">Carregando estatísticas...</p>;
  if (error || !stats) {
    return (
      <p className="text-sm text-red-400">
        Não foi possível carregar as estatísticas
        {error instanceof Error ? `: ${error.message}` : "."}
      </p>
    );
  }

  const maxPageViews = Math.max(1, ...stats.pageViewsPorDia.map((d) => d.contagem));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-ink-300 mb-2">Usuários</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Usuários totais" value={stats.usuariosTotais} />
          <StatCard label="Novos (7 dias)" value={stats.novosUsuarios7d} />
          <StatCard label="Ativos últimas 24h" value={stats.usuariosAtivos24h} />
          <StatCard label="Ativos últimos 7 dias" value={stats.usuariosAtivos7d} />
          <StatCard label="Ativos últimos 30 dias" value={stats.usuariosAtivos30d} />
          <StatCard label="Sessões (30 dias)" value={stats.sessoes30d} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-300 mb-2">Engajamento</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Tempo médio por sessão"
            value={`${stats.tempoMedioSessaoMin} min`}
            hint="Estimado por heartbeat, sessões com 2+ eventos"
          />
          <StatCard
            label="Sessões de 1 evento só"
            value={`${stats.taxaSessaoUnicoEvento30d}%`}
            hint="Entrou e saiu sem interagir"
          />
          <StatCard label="Propostas criadas (total)" value={stats.eventosPropostasTotal} />
          <StatCard label="Propostas (7 dias)" value={stats.eventosPropostas7d} />
          <StatCard label="Compromissos confirmados" value={stats.compromissosConfirmadosTotal} />
          <StatCard
            label="Taxa de check-in"
            value={`${stats.taxaCheckin}%`}
            hint={`${stats.checkinsTotal} check-ins`}
          />
          <StatCard label="Mensagens no chat" value={stats.mensagensChatTotal} />
          <StatCard label="Fotos postadas" value={stats.fotosPostadasTotal} />
        </div>
      </div>

      {stats.pageViewsPorDia.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-300 mb-2">Acessos por dia (14 dias)</h3>
          <div className="flex items-stretch gap-1 h-24 bg-ink-800/40 border border-ink-700 rounded-2xl p-3">
            {stats.pageViewsPorDia.map((d) => (
              <div key={d.dia} className="flex-1 flex flex-col justify-end gap-1" title={`${d.dia}: ${d.contagem}`}>
                <div
                  className="w-full bg-coral-500 rounded-t"
                  style={{ height: `${Math.max(4, (d.contagem / maxPageViews) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.topPaginas7d.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-300 mb-2">Páginas mais acessadas (7 dias)</h3>
          <div className="space-y-1">
            {stats.topPaginas7d.map((p) => (
              <div key={p.path} className="flex items-center justify-between text-sm bg-ink-800/40 border border-ink-700 rounded-lg px-3 py-1.5">
                <span className="text-ink-300 truncate">{p.path}</span>
                <span className="text-ink-500 font-semibold">{p.contagem}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesSection() {
  const { data: categories, isLoading, createCategory, setAtivo, isSubmitting, error } = useAdminCategories();
  const [nome, setNome] = useState("");
  const [emoji, setEmoji] = useState(ICON_OPTIONS[0]);
  const [cor, setCor] = useState("#12E0B2");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ordem = (categories?.length ?? 0) + 1;
    const ok = await createCategory({ nome, emoji, cor, ordem });
    if (ok) {
      setNome("");
      setEmoji(ICON_OPTIONS[0]);
      setCor("#12E0B2");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-ink-300">Categorias</h3>

      {isLoading && <p className="text-sm text-ink-400">Carregando...</p>}

      <div className="space-y-2">
        {(categories ?? []).map((cat) => (
          <div
            key={cat.id}
            className={`flex items-center gap-3 bg-ink-800/60 border border-ink-700 rounded-xl p-3 ${
              !cat.ativo ? "opacity-50" : ""
            }`}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: cat.cor }}
            >
              {cat.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-100 truncate">{cat.nome}</p>
              <p className="text-[11px] text-ink-500">{cat.id}</p>
            </div>
            <button
              type="button"
              onClick={() => setAtivo(cat.id, !cat.ativo)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                cat.ativo
                  ? "border-ink-700 text-ink-400 hover:text-red-400 hover:border-red-500/50"
                  : "border-quorum-500/50 text-quorum-500"
              }`}
            >
              {cat.ativo ? "Desativar" : "Reativar"}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="bg-ink-800/40 border border-ink-700 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-ink-200">Nova categoria</p>
        <div className="flex gap-2">
          <IconPicker value={emoji} onChange={setEmoji} />
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome (ex.: Gastronomia)"
            required
            className="flex-1 bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
          />
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="w-12 h-12 bg-ink-900 border border-ink-700 rounded-xl p-1 cursor-pointer"
            aria-label="Cor"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !nome.trim()}
          className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isSubmitting ? "Criando..." : "Criar categoria"}
        </button>
      </form>
    </div>
  );
}

export function AdminScreen() {
  return (
    <AppShell title="Painel do administrador">
      <div className="space-y-8">
        <StatsSection />
        <CategoriesSection />
      </div>
    </AppShell>
  );
}
