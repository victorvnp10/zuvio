import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FriendsRepository } from "../../infrastructure/supabase/repositories/FriendsRepository";
import { useAuth } from "../context/AuthContext";

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: () => FriendsRepository.listFriendships(user!.id),
    enabled: Boolean(user),
  });

  const pendingReceivedQuery = useQuery({
    queryKey: ["friend-requests-received", user?.id],
    queryFn: () => FriendsRepository.listPendingReceived(user!.id),
    enabled: Boolean(user),
  });

  const pendingSentQuery = useQuery({
    queryKey: ["friend-requests-sent", user?.id],
    queryFn: () => FriendsRepository.listPendingSent(user!.id),
    enabled: Boolean(user),
  });

  const groupsQuery = useQuery({
    queryKey: ["friend-groups", user?.id],
    queryFn: () => FriendsRepository.listGroups(user!.id),
    enabled: Boolean(user),
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["friendships", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["friend-requests-received", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["friend-requests-sent", user?.id] });
  }, [queryClient, user?.id]);

  const sendRequest = useCallback(
    async (addresseeId: string) => {
      if (!user) return;
      setError(null);
      try {
        await FriendsRepository.sendRequest(user.id, addresseeId);
        invalidateAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
      }
    },
    [user, invalidateAll]
  );

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      setError(null);
      try {
        await FriendsRepository.acceptRequest(friendshipId);
        invalidateAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível aceitar o pedido.");
      }
    },
    [invalidateAll]
  );

  const removeFriendship = useCallback(
    async (friendshipId: string) => {
      setError(null);
      try {
        await FriendsRepository.removeFriendship(friendshipId);
        invalidateAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
      }
    },
    [invalidateAll]
  );

  const createGroup = useCallback(
    async (nome: string) => {
      if (!user) return;
      setError(null);
      try {
        await FriendsRepository.createGroup(user.id, nome);
        queryClient.invalidateQueries({ queryKey: ["friend-groups", user.id] });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar o grupo.");
      }
    },
    [user, queryClient]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      setError(null);
      try {
        await FriendsRepository.deleteGroup(groupId);
        queryClient.invalidateQueries({ queryKey: ["friend-groups", user?.id] });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível excluir o grupo.");
      }
    },
    [queryClient, user?.id]
  );

  return {
    friendships: friendshipsQuery.data ?? [],
    pendingReceived: pendingReceivedQuery.data ?? [],
    pendingSent: pendingSentQuery.data ?? [],
    groups: groupsQuery.data ?? [],
    isLoading: friendshipsQuery.isLoading,
    error,
    sendRequest,
    acceptRequest,
    removeFriendship,
    createGroup,
    deleteGroup,
  };
}
