import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useFriends } from "../../application/hooks/useFriends";
import { useGroups } from "../../application/hooks/useGroups";
import { useAuth } from "../../application/context/AuthContext";
import { FriendsRepository } from "../../infrastructure/supabase/repositories/FriendsRepository";
import { FriendRow } from "../components/FriendRow";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import type { Profile } from "../../domain/entities/types";
import { Search, UserPlus, Plus, Trash2, Users } from "lucide-react";

function PendingRequestRow({
  friendshipId,
  userId,
  onAccept,
  onDecline,
}: {
  friendshipId: string;
  userId: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const { data: profile } = usePublicProfile(userId);
  if (!profile) return null;

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 flex items-center justify-between">
      <p className="font-medium text-ink-100">{profile.nome}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(friendshipId)}
          className="text-xs font-semibold bg-coral-500 text-ink-950 px-3 py-1.5 rounded-full"
        >
          Aceitar
        </button>
        <button
          onClick={() => onDecline(friendshipId)}
          className="text-xs font-semibold border border-ink-600 text-ink-300 px-3 py-1.5 rounded-full"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}

function PendingSentName({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  return <p className="text-sm text-ink-100">{profile?.nome ?? "..."}</p>;
}

export function FriendsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    friendships,
    pendingReceived,
    pendingSent,
    groups: marcadores,
    error,
    sendRequest,
    acceptRequest,
    removeFriendship,
    createGroup: createMarcador,
    deleteGroup: deleteMarcador,
  } = useFriends();
  const { groups: sharedGroups, isLoading: isLoadingGroups, createGroup } = useGroups();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newSharedGroupName, setNewSharedGroupName] = useState("");
  const [tab, setTab] = useState<"amigos" | "pedidos" | "grupos" | "marcadores">("amigos");

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setIsSearching(true);
    try {
      const results = await FriendsRepository.searchProfiles(searchQuery, user.id);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const friendUserIds = friendships.map((f) =>
    f.requesterId === user?.id ? f.addresseeId : f.requesterId
  );

  return (
    <AppShell title="Amigos">
      <div className="flex gap-2 mb-4">
        {(["amigos", "pedidos", "grupos", "marcadores"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold capitalize transition-colors ${
              tab === t ? "bg-coral-500 text-ink-950" : "bg-ink-800 text-ink-400"
            }`}
          >
            {t}
            {t === "pedidos" && pendingReceived.length > 0 && ` (${pendingReceived.length})`}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {tab === "amigos" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar por nome..."
              className="flex-1 bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-ink-800 border border-ink-700 rounded-xl px-3 text-ink-300"
            >
              <Search size={18} />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((profile) => {
                const alreadyFriend = friendUserIds.includes(profile.id);
                const alreadySent = pendingSent.some((f) => f.addresseeId === profile.id);
                return (
                  <div
                    key={profile.id}
                    className="bg-ink-800/60 border border-ink-700 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <p className="text-sm text-ink-100">{profile.nome}</p>
                    {alreadyFriend ? (
                      <span className="text-xs text-quorum-500">Já é amigo</span>
                    ) : alreadySent ? (
                      <span className="text-xs text-ink-500">Pedido enviado</span>
                    ) : (
                      <button
                        onClick={() => sendRequest(profile.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-coral-500"
                      >
                        <UserPlus size={14} /> Adicionar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="text-sm font-semibold text-ink-400 uppercase tracking-wide pt-2">
            Meus amigos ({friendUserIds.length})
          </h2>
          {friendUserIds.length === 0 && (
            <p className="text-sm text-ink-500">Busque alguém acima para começar.</p>
          )}
          <div className="space-y-3">
            {friendships.map((f) => {
              const otherId = f.requesterId === user?.id ? f.addresseeId : f.requesterId;
              return (
                <FriendRow
                  key={f.id}
                  friendUserId={otherId}
                  friendshipId={f.id}
                  groups={marcadores}
                  onRemove={removeFriendship}
                />
              );
            })}
          </div>
        </div>
      )}

      {tab === "pedidos" && (
        <div className="space-y-5">
          <section>
            <h2 className="text-sm font-semibold text-ink-400 uppercase tracking-wide mb-2">
              Recebidos
            </h2>
            {pendingReceived.length === 0 && (
              <p className="text-sm text-ink-500">Nenhum pedido pendente.</p>
            )}
            <div className="space-y-2">
              {pendingReceived.map((f) => (
                <PendingRequestRow
                  key={f.id}
                  friendshipId={f.id}
                  userId={f.requesterId}
                  onAccept={acceptRequest}
                  onDecline={removeFriendship}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-ink-400 uppercase tracking-wide mb-2">
              Enviados
            </h2>
            {pendingSent.length === 0 && (
              <p className="text-sm text-ink-500">Nenhum pedido enviado aguardando resposta.</p>
            )}
            <div className="space-y-2">
              {pendingSent.map((f) => (
                <div
                  key={f.id}
                  className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 flex items-center justify-between"
                >
                  <PendingSentName userId={f.addresseeId} />
                  <button
                    onClick={() => removeFriendship(f.id)}
                    className="text-xs text-ink-500 hover:text-red-400"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "grupos" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-400">
            Grupos compartilhados, estilo WhatsApp: várias pessoas participam do mesmo grupo, e
            quem cria é o administrador — pode adicionar/remover membros e gerar um link de
            convite (compartilhável por WhatsApp ou e-mail).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSharedGroupName}
              onChange={(e) => setNewSharedGroupName(e.target.value)}
              placeholder="Nome do grupo (ex.: Pedal de sábado)"
              className="flex-1 bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
            />
            <button
              onClick={async () => {
                if (newSharedGroupName.trim()) {
                  const created = await createGroup(newSharedGroupName.trim());
                  if (created) setNewSharedGroupName("");
                }
              }}
              className="bg-coral-500 text-ink-950 rounded-xl px-3"
            >
              <Plus size={18} />
            </button>
          </div>

          {isLoadingGroups && <p className="text-sm text-ink-500">Carregando...</p>}

          {!isLoadingGroups && sharedGroups.length === 0 && (
            <p className="text-sm text-ink-500">
              Você ainda não participa de nenhum grupo. Crie um acima.
            </p>
          )}

          <div className="space-y-2">
            {sharedGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => navigate(`/grupos/${group.id}`)}
                className="w-full flex items-center gap-3 bg-ink-800/60 border border-ink-700 rounded-2xl p-4 text-left"
              >
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-ink-600 to-ink-800 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-ink-200" />
                </span>
                <p className="text-sm text-ink-100 truncate">{group.nome}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "marcadores" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-400">
            Marcadores são pessoais — só você vê, servem pra organizar sua própria lista de
            amigos (ex.: "Amigos do trabalho").
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do novo marcador (ex.: Amigos do trabalho)"
              className="flex-1 bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (newGroupName.trim()) {
                  createMarcador(newGroupName.trim());
                  setNewGroupName("");
                }
              }}
              className="bg-coral-500 text-ink-950 rounded-xl px-3"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {marcadores.map((marcador) => (
              <div
                key={marcador.id}
                className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 flex items-center justify-between"
              >
                <p className="text-sm text-ink-100">
                  {marcador.nome}
                  {marcador.isSystem && <span className="text-xs text-ink-500 ml-2">(padrão)</span>}
                </p>
                {!marcador.isSystem && (
                  <button
                    onClick={() => deleteMarcador(marcador.id)}
                    className="text-ink-500 hover:text-red-400"
                    aria-label="Excluir marcador"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-ink-500">
            Toque no ícone de pessoas ao lado de um amigo (na aba Amigos) para marcá-lo em um ou
            mais marcadores.
          </p>
        </div>
      )}
    </AppShell>
  );
}
