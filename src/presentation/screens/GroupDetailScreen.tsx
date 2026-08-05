import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, UserMinus, UserPlus, LogOut, Trash2, Search } from "lucide-react";
import { useGroupDetail } from "../../application/hooks/useGroupDetail";
import { useAuth } from "../../application/context/AuthContext";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { FriendsRepository } from "../../infrastructure/supabase/repositories/FriendsRepository";
import { Avatar } from "../components/Avatar";
import { ShareLinkSection } from "../components/ShareLinkSection";
import { BottomNav } from "../layout/BottomNav";
import type { Profile } from "../../domain/entities/types";

function MemberRow({
  userId,
  papel,
  isAdmin,
  isSelf,
  onRemove,
  onPromote,
  onDemote,
}: {
  userId: string;
  papel: "admin" | "membro";
  isAdmin: boolean;
  isSelf: boolean;
  onRemove: () => void;
  onPromote: () => void;
  onDemote: () => void;
}) {
  const { data: profile } = usePublicProfile(userId);

  return (
    <div className="flex items-center gap-3 bg-ink-800/60 border border-ink-700 rounded-2xl p-3">
      <Avatar fotoUrl={profile?.fotoUrl} nome={profile?.nome} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-100 truncate">
          {profile?.nome ?? "..."} {isSelf && <span className="text-ink-500">(você)</span>}
        </p>
        {papel === "admin" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">
            <Crown size={11} /> Admin
          </span>
        )}
      </div>
      {isAdmin && !isSelf && (
        <div className="flex items-center gap-1">
          {papel === "membro" ? (
            <button
              onClick={onPromote}
              className="text-[11px] font-semibold text-ink-300 border border-ink-600 px-2 py-1 rounded-full"
            >
              Tornar admin
            </button>
          ) : (
            <button
              onClick={onDemote}
              className="text-[11px] font-semibold text-ink-300 border border-ink-600 px-2 py-1 rounded-full"
            >
              Remover admin
            </button>
          )}
          <button onClick={onRemove} className="p-1.5 text-ink-500 hover:text-red-400" aria-label="Remover">
            <UserMinus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function AddMemberModal({
  existingIds,
  onClose,
  onAdd,
}: {
  existingIds: string[];
  onClose: () => void;
  onAdd: (userId: string) => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || !user) return;
    setIsSearching(true);
    try {
      const found = await FriendsRepository.searchProfiles(query, user.id);
      setResults(found);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center p-4 z-50">
      <div className="bg-ink-800 border border-ink-700 rounded-2xl p-5 max-w-sm w-full space-y-4">
        <h3 className="font-display font-semibold text-lg">Adicionar ao grupo</h3>
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por nome..."
            className="flex-1 bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-ink-900 border border-ink-700 rounded-xl px-3 text-ink-300"
          >
            <Search size={18} />
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((profile) => {
            const already = existingIds.includes(profile.id);
            return (
              <div
                key={profile.id}
                className="flex items-center justify-between bg-ink-900 border border-ink-700 rounded-xl p-2.5"
              >
                <span className="text-sm text-ink-100">{profile.nome}</span>
                {already ? (
                  <span className="text-xs text-quorum-500">Já é membro</span>
                ) : (
                  <button
                    onClick={() => onAdd(profile.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-coral-500"
                  >
                    <UserPlus size={14} /> Adicionar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export function GroupDetailScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    group,
    members,
    invite,
    isAdmin,
    isLoading,
    error,
    addMember,
    removeMember,
    setMemberRole,
    leaveGroup,
    deleteGroup,
    ensureInvite,
    regenerateInvite,
  } = useGroupDetail(groupId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isLoading || !group) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  const memberIds = members.map((m) => m.userId);
  const inviteLink = invite ? `${window.location.origin}/grupos/convite/${invite.codigo}` : null;

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-20">
      <header className="sticky top-0 z-20 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-300 hover:text-ink-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold truncate">{group.nome}</h1>
          <p className="text-xs text-ink-500">
            {members.length} membro{members.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {group.descricao && <p className="text-sm text-ink-300">{group.descricao}</p>}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {isAdmin && (
          <>
            {inviteLink ? (
              <ShareLinkSection
                link={inviteLink}
                title="Link de convite do grupo"
                message="Entre no meu grupo no Zuvio! Quem abrir esse link entra direto (cadastra-se antes, se ainda não tiver conta)."
              />
            ) : (
              <button
                onClick={ensureInvite}
                className="w-full bg-ink-800/60 border border-ink-700 rounded-2xl p-4 text-sm font-semibold text-coral-500"
              >
                Gerar link de convite
              </button>
            )}
            {inviteLink && (
              <button onClick={regenerateInvite} className="text-xs text-ink-500 hover:text-ink-300">
                Gerar novo link (o link atual deixa de funcionar)
              </button>
            )}
          </>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-400 uppercase tracking-wide">Membros</h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-xs font-semibold text-coral-500"
            >
              <UserPlus size={14} /> Adicionar
            </button>
          )}
        </div>

        <div className="space-y-2">
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              userId={m.userId}
              papel={m.papel}
              isAdmin={isAdmin}
              isSelf={m.userId === user?.id}
              onRemove={() => removeMember(m.userId)}
              onPromote={() => setMemberRole(m.userId, "admin")}
              onDemote={() => setMemberRole(m.userId, "membro")}
            />
          ))}
        </div>

        <div className="pt-2">
          {isAdmin ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="w-full flex items-center justify-center gap-2 text-red-400 font-semibold py-2.5 text-sm"
            >
              <Trash2 size={16} /> Excluir grupo
            </button>
          ) : (
            <button
              onClick={() => setConfirmingLeave(true)}
              className="w-full flex items-center justify-center gap-2 text-red-400 font-semibold py-2.5 text-sm"
            >
              <LogOut size={16} /> Sair do grupo
            </button>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddMemberModal
          existingIds={memberIds}
          onClose={() => setShowAddModal(false)}
          onAdd={(userId) => addMember(userId)}
        />
      )}

      {(confirmingLeave || confirmingDelete) && (
        <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display font-semibold text-lg">
              {confirmingDelete ? "Excluir este grupo?" : "Sair deste grupo?"}
            </h3>
            <p className="text-sm text-ink-400">
              {confirmingDelete
                ? "O grupo será apagado para todo mundo, sem deixar rastro. Essa ação não pode ser desfeita."
                : "Você precisará de um novo convite para entrar de novo."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmingLeave(false);
                  setConfirmingDelete(false);
                }}
                className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  const ok = confirmingDelete ? await deleteGroup() : await leaveGroup();
                  if (ok) navigate("/grupos");
                }}
                className="flex-1 bg-red-500 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
