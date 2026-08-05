import { useState } from "react";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import type { FriendGroup } from "../../domain/entities/types";
import { useFriendGroupMembers } from "../../application/hooks/useFriendGroupMembers";
import { Users, X } from "lucide-react";

function GroupToggle({ group, friendUserId }: { group: FriendGroup; friendUserId: string }) {
  const { memberIds, toggleMember } = useFriendGroupMembers(group.id);
  const isMember = memberIds.includes(friendUserId);

  return (
    <button
      onClick={() => toggleMember(friendUserId)}
      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
        isMember
          ? "bg-coral-500/15 border-coral-500/40 text-coral-500"
          : "border-ink-700 text-ink-400"
      }`}
    >
      {group.nome}
    </button>
  );
}

export function FriendRow({
  friendUserId,
  friendshipId,
  groups,
  onRemove,
}: {
  friendUserId: string;
  friendshipId: string;
  groups: FriendGroup[];
  onRemove: (friendshipId: string) => void;
}) {
  const { data: profile } = usePublicProfile(friendUserId);
  const [showGroups, setShowGroups] = useState(false);

  if (!profile) return null;

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink-100">{profile.nome}</p>
          <p className="text-xs text-ink-500">{profile.localizacaoBase}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGroups((v) => !v)}
            className="p-2 text-ink-400 hover:text-ink-100"
            aria-label="Gerenciar grupos"
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => onRemove(friendshipId)}
            className="p-2 text-ink-500 hover:text-red-400"
            aria-label="Remover amigo"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {showGroups && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-700">
          {groups.map((group) => (
            <GroupToggle key={group.id} group={group} friendUserId={friendUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
