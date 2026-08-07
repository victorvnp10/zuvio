import { supabase } from "../client";
import { toProfile, toRankedProfile, toFriendship, toFriendGroup } from "../mappers";
import type { Friendship, FriendGroup, Profile, RankedProfile } from "../../../domain/entities/types";

export const FriendsRepository = {
  /**
   * Busca por nome (parcial) OU e-mail (exato — nunca parcial, pra não
   * virar um jeito de varrer e-mails do sistema), entre todos os
   * cadastrados, já ranqueada por proximidade de rede de amigos, depois
   * localização, depois recência (ver função `search_profiles_ranked`,
   * migração 0043).
   */
  async searchProfilesRanked(query: string, limit = 30): Promise<RankedProfile[]> {
    const { data, error } = await supabase.rpc("search_profiles_ranked", {
      p_query: query,
      p_limit: limit,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toRankedProfile);
  },

  /** Sugestões de amizade sem busca ativa — mesma lógica de proximidade, excluindo quem já é amigo ou já tem pedido pendente. */
  async suggestFriends(limit = 10): Promise<RankedProfile[]> {
    const { data, error } = await supabase.rpc("suggest_friends", { p_limit: limit });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toRankedProfile);
  },

  /** @deprecated use searchProfilesRanked — mantido só caso algo ainda chame o nome antigo. */
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

  /** Membros de vários grupos de uma vez — usado no seletor de convite. */
  async listMembersForGroups(groupIds: string[]): Promise<Record<string, string[]>> {
    if (groupIds.length === 0) return {};
    const { data, error } = await supabase
      .from("friend_group_members")
      .select("group_id, friend_user_id")
      .in("group_id", groupIds);
    if (error) throw new Error(error.message);

    const byGroup: Record<string, string[]> = {};
    for (const row of data ?? []) {
      byGroup[row.group_id] = [...(byGroup[row.group_id] ?? []), row.friend_user_id];
    }
    return byGroup;
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
