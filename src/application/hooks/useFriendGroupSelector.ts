import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "./useFriends";
import { FriendsRepository } from "../../infrastructure/supabase/repositories/FriendsRepository";

export function useFriendGroupSelector() {
  const { user } = useAuth();
  const { friendships, groups } = useFriends();
  const [membersByGroup, setMembersByGroup] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (groups.length === 0) return;
    FriendsRepository.listMembersForGroups(groups.map((g) => g.id)).then(setMembersByGroup);
  }, [groups]);

  const friendIds = friendships.map((f) => (f.requesterId === user?.id ? f.addresseeId : f.requesterId));

  return { friendIds, groups, membersByGroup };
}
