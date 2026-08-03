import { useCallback, useEffect, useState } from "react";
import { CollaborativeItemsRepository } from "../../infrastructure/supabase/repositories/CollaborativeItemsRepository";
import type { CollaborativeItem } from "../../domain/entities/types";

export function useCollaborativeItems(eventId: string | undefined) {
  const [items, setItems] = useState<CollaborativeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const data = await CollaborativeItemsRepository.listForEvent(eventId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a lista.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addItem = useCallback(
    async (nome: string, userId: string) => {
      if (!eventId) return;
      setError(null);
      try {
        await CollaborativeItemsRepository.addItem(eventId, nome, userId);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível adicionar o item.");
      }
    },
    [eventId, reload]
  );

  const toggleReserve = useCallback(
    async (item: CollaborativeItem, userId: string) => {
      setError(null);
      try {
        await CollaborativeItemsRepository.toggleReserve(item.id, userId, item.reservadoPor);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar o item.");
      }
    },
    [reload]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setError(null);
      try {
        await CollaborativeItemsRepository.removeItem(itemId);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível remover o item.");
      }
    },
    [reload]
  );

  return { items, isLoading, error, addItem, toggleReserve, removeItem };
}
