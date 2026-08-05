import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupsRepository } from "../../infrastructure/supabase/repositories/GroupsRepository";
import { useAuth } from "../context/AuthContext";

export function useGroupDetail(groupId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => GroupsRepository.getById(groupId!),
    enabled: Boolean(groupId),
  });

  const membersQuery = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => GroupsRepository.listMembers(groupId!),
    enabled: Boolean(groupId),
  });

  const inviteQuery = useQuery({
    queryKey: ["group-invite", groupId],
    queryFn: () => GroupsRepository.getActiveInvite(groupId!),
    enabled: Boolean(groupId),
  });

  const myMembership = membersQuery.data?.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.papel === "admin";

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    queryClient.invalidateQueries({ queryKey: ["my-groups", user?.id] });
  }, [queryClient, groupId, user?.id]);

  const addMember = useCallback(
    async (userId: string) => {
      if (!groupId) return;
      setError(null);
      try {
        await GroupsRepository.addMember(groupId, userId);
        invalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível adicionar essa pessoa.");
      }
    },
    [groupId, invalidate]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!groupId) return;
      setError(null);
      try {
        await GroupsRepository.removeMember(groupId, userId);
        invalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível remover essa pessoa.");
      }
    },
    [groupId, invalidate]
  );

  const setMemberRole = useCallback(
    async (userId: string, papel: "admin" | "membro") => {
      if (!groupId) return;
      setError(null);
      try {
        await GroupsRepository.setMemberRole(groupId, userId, papel);
        invalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar o papel.");
      }
    },
    [groupId, invalidate]
  );

  const leaveGroup = useCallback(async () => {
    if (!groupId || !user) return false;
    setError(null);
    try {
      await GroupsRepository.leave(groupId, user.id);
      queryClient.invalidateQueries({ queryKey: ["my-groups", user.id] });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível sair do grupo.");
      return false;
    }
  }, [groupId, user, queryClient]);

  const deleteGroup = useCallback(async () => {
    if (!groupId || !user) return false;
    setError(null);
    try {
      await GroupsRepository.delete(groupId);
      queryClient.invalidateQueries({ queryKey: ["my-groups", user.id] });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o grupo.");
      return false;
    }
  }, [groupId, user, queryClient]);

  const ensureInvite = useCallback(async () => {
    if (!groupId || !user) return null;
    if (inviteQuery.data) return inviteQuery.data;
    try {
      const invite = await GroupsRepository.createInvite(groupId, user.id);
      queryClient.invalidateQueries({ queryKey: ["group-invite", groupId] });
      return invite;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link de convite.");
      return null;
    }
  }, [groupId, user, inviteQuery.data, queryClient]);

  const regenerateInvite = useCallback(async () => {
    if (!groupId || !user) return null;
    setError(null);
    try {
      if (inviteQuery.data) await GroupsRepository.revokeInvite(inviteQuery.data.id);
      const invite = await GroupsRepository.createInvite(groupId, user.id);
      queryClient.invalidateQueries({ queryKey: ["group-invite", groupId] });
      return invite;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar um novo link.");
      return null;
    }
  }, [groupId, user, inviteQuery.data, queryClient]);

  return {
    group: groupQuery.data,
    members: membersQuery.data ?? [],
    invite: inviteQuery.data,
    isAdmin,
    isLoading: groupQuery.isLoading || membersQuery.isLoading,
    error,
    addMember,
    removeMember,
    setMemberRole,
    leaveGroup,
    deleteGroup,
    ensureInvite,
    regenerateInvite,
  };
}
