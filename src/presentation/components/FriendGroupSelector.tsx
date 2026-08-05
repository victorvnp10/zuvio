import { useFriendGroupSelector } from "../../application/hooks/useFriendGroupSelector";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";

function FriendCheckbox({
  friendId,
  checked,
  onToggle,
}: {
  friendId: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { data: profile } = usePublicProfile(friendId);
  if (!profile) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-sm text-left transition-colors ${
        checked ? "border-coral-500 bg-coral-500/10 text-ink-100" : "border-ink-700 text-ink-300"
      }`}
    >
      {profile.nome}
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center ${
          checked ? "bg-coral-500 border-coral-500" : "border-ink-600"
        }`}
      >
        {checked && "✓"}
      </span>
    </button>
  );
}

export function FriendGroupSelector({
  selectedFriendIds,
  onChange,
}: {
  selectedFriendIds: string[];
  onChange: (friendIds: string[]) => void;
}) {
  const { friendIds, groups, membersByGroup } = useFriendGroupSelector();

  const toggleFriend = (friendId: string) => {
    if (selectedFriendIds.includes(friendId)) {
      onChange(selectedFriendIds.filter((id) => id !== friendId));
    } else {
      onChange([...selectedFriendIds, friendId]);
    }
  };

  const isGroupFullySelected = (groupId: string) => {
    const members = membersByGroup[groupId] ?? [];
    return members.length > 0 && members.every((id) => selectedFriendIds.includes(id));
  };

  const toggleGroup = (groupId: string) => {
    const members = membersByGroup[groupId] ?? [];
    if (isGroupFullySelected(groupId)) {
      onChange(selectedFriendIds.filter((id) => !members.includes(id)));
    } else {
      onChange(Array.from(new Set([...selectedFriendIds, ...members])));
    }
  };

  if (friendIds.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Você ainda não tem amigos adicionados — adicione em "Amigos" antes de convidar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.length > 0 && (
        <div>
          <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">Grupos</p>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-sm text-left transition-colors ${
                  isGroupFullySelected(group.id)
                    ? "border-coral-500 bg-coral-500/10 text-ink-100"
                    : "border-ink-700 text-ink-300"
                }`}
              >
                {group.nome}{" "}
                <span className="text-xs text-ink-500">
                  ({(membersByGroup[group.id] ?? []).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-ink-400 uppercase tracking-wide mb-2">Amigos</p>
        <div className="space-y-2">
          {friendIds.map((friendId) => (
            <FriendCheckbox
              key={friendId}
              friendId={friendId}
              checked={selectedFriendIds.includes(friendId)}
              onToggle={() => toggleFriend(friendId)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-500">{selectedFriendIds.length} selecionado(s)</p>
    </div>
  );
}
