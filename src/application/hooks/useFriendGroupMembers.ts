import { useCallback, useEffect, useState } from "react";
import { FriendsRepository } from "../../infrastructure/supabase/repositories/FriendsRepository";

export function useFriendGroupMembers(groupId: string) {
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const ids = await FriendsRepository.listGroupMemberIds(groupId);
      setMemberIds(ids);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleMember = useCallback(
    async (friendUserId: string) => {
      const isMember = memberIds.includes(friendUserId);
      if (isMember) {
        await FriendsRepository.removeMemberFromGroup(groupId, friendUserId);
      } else {
        await FriendsRepository.addMemberToGroup(groupId, friendUserId);
      }
      await reload();
    },
    [groupId, memberIds, reload]
  );

  return { memberIds, isLoading, toggleMember };
}
