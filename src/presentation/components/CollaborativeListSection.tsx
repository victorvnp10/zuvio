import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { useCollaborativeItems } from "../../application/hooks/useCollaborativeItems";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import type { CollaborativeItem, ModoListaColaborativa } from "../../domain/entities/types";

function ReservedByName({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  return <>{profile?.nome ?? "..."}</>;
}

function ItemRow({
  item,
  currentUserId,
  isCreator,
  onToggle,
  onRemove,
}: {
  item: CollaborativeItem;
  currentUserId: string;
  isCreator: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const isReservedByMe = item.reservadoPor === currentUserId;
  const canRemove = item.criadoPor === currentUserId || isCreator;

  return (
    <div className="flex items-center justify-between bg-ink-900/50 rounded-xl px-3 py-2.5">
      <div>
        <p className={`text-sm ${item.reservadoPor ? "text-ink-300" : "text-ink-100"}`}>
          {item.nome}
        </p>
        {item.reservadoPor && (
          <p className="text-xs text-quorum-500">
            <ReservedByName userId={item.reservadoPor} /> vai levar
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
            isReservedByMe
              ? "bg-quorum-500/15 border-quorum-500/40 text-quorum-500"
              : item.reservadoPor
              ? "border-ink-700 text-ink-600 cursor-not-allowed"
              : "border-coral-500/40 text-coral-500"
          }`}
          disabled={Boolean(item.reservadoPor) && !isReservedByMe}
        >
          {isReservedByMe ? <Check size={14} /> : "Eu levo"}
        </button>
        {canRemove && (
          <button onClick={onRemove} className="text-ink-600 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function CollaborativeListSection({
  eventId,
  modoLista,
  currentUserId,
  isCreator,
}: {
  eventId: string;
  modoLista: ModoListaColaborativa | null;
  currentUserId: string;
  isCreator: boolean;
}) {
  const { items, error, addItem, toggleReserve, removeItem } = useCollaborativeItems(eventId);
  const [newItemName, setNewItemName] = useState("");

  const canAddFreely = isCreator || modoLista === "livre" || modoLista === "mista";

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    await addItem(newItemName.trim(), currentUserId);
    setNewItemName("");
  };

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
      <h3 className="font-display font-semibold">O que cada um vai levar</h3>

      {items.length === 0 && (
        <p className="text-sm text-ink-500">Nenhum item na lista ainda.</p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            isCreator={isCreator}
            onToggle={() => toggleReserve(item, currentUserId)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      {canAddFreely && (
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Adicionar item (ex.: Refrigerante 2L)"
            className="flex-1 bg-ink-900 border border-ink-700 rounded-xl px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="bg-coral-500 text-ink-950 font-semibold px-4 rounded-xl text-sm"
          >
            +
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
