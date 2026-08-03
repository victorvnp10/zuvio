import { supabase } from "../client";
import { toProfile, toFriendship, toFriendGroup } from "../mappers";
import type { Friendship, FriendGroup, Profile } from "../../../domain/entities/types";

export const FriendsRepository = {
  async searchProfiles(query: string, excludeUserId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("*")
      .ilike("nome", `%${query}%`)
      .neq("id", excludeUserId)
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toProfile);
  },

  /** Amizades aceitas onde o usuário é uma das duas partes. */
  async listFriendships(userId: string): Promise<Friendship[]> {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "aceito")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFriendship);
  },

  /** Pedidos pendentes recebidos (esperando eu aceitar/recusar). */
  async listPendingReceived(userId: string): Promise<Friendship[]> {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "pendente")
      .eq("addressee_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFriendship);
  },

  /** Pedidos que eu enviei e ainda esperam resposta. */
  async listPendingSent(userId: string): Promise<Friendship[]> {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "pendente")
      .eq("requester_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFriendship);
  },

  async sendRequest(requesterId: string, addresseeId: string): Promise<void> {
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: requesterId, addressee_id: addresseeId });
    if (error) throw new Error(error.message);
  },

  async acceptRequest(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "aceito" })
      .eq("id", friendshipId);
    if (error) throw new Error(error.message);
  },

  /** Recusar um pedido pendente ou desfazer uma amizade já aceita — mesma operação. */
  async removeFriendship(friendshipId: string): Promise<void> {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) throw new Error(error.message);
  },

  async listGroups(ownerId: string): Promise<FriendGroup[]> {
    const { data, error } = await supabase
      .from("friend_groups")
      .select("*")
      .eq("owner_id", ownerId)
      .order("is_system", { ascending: false })
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFriendGroup);
  },

  async createGroup(ownerId: string, nome: string): Promise<FriendGroup> {
    const { data, error } = await supabase
      .from("friend_groups")
      .insert({ owner_id: ownerId, nome, is_system: false })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toFriendGroup(data);
  },

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase.from("friend_groups").delete().eq("id", groupId);
    if (error) throw new Error(error.message);
  },

  async listGroupMemberIds(groupId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("friend_group_members")
      .select("friend_user_id")
      .eq("group_id", groupId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.friend_user_id);
  },

  async addMemberToGroup(groupId: string, friendUserId: string): Promise<void> {
    const { error } = await supabase
      .from("friend_group_members")
      .insert({ group_id: groupId, friend_user_id: friendUserId });
    if (error) throw new Error(error.message);
  },

  async removeMemberFromGroup(groupId: string, friendUserId: string): Promise<void> {
    const { error } = await supabase
      .from("friend_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("friend_user_id", friendUserId);
    if (error) throw new Error(error.message);
  },
};
