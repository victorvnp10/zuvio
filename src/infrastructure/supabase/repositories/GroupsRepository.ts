import { supabase } from "../client";
import { toSharedGroup, toGroupMember, toGroupInvite } from "../mappers";
import type { SharedGroup, GroupMember, GroupInvite } from "../../../domain/entities/types";

export const GroupsRepository = {
  /** Grupos dos quais o usuário é membro (não só os que ele criou). */
  async listMine(userId: string): Promise<SharedGroup[]> {
    const { data, error } = await supabase
      .from("group_members")
      .select("groups(*)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row) => (row as unknown as { groups: Parameters<typeof toSharedGroup>[0] }).groups)
      .filter(Boolean)
      .map(toSharedGroup);
  },

  async getById(groupId: string): Promise<SharedGroup | null> {
    const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSharedGroup(data) : null;
  },

  /** Cria o grupo já com o criador como admin (função atômica no banco). */
  async create(nome: string, descricao?: string): Promise<SharedGroup> {
    const { data, error } = await supabase.rpc("create_group", {
      p_nome: nome,
      p_descricao: descricao ?? null,
    });
    if (error) throw new Error(error.message);
    return toSharedGroup(data);
  },

  async delete(groupId: string): Promise<void> {
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) throw new Error(error.message);
  },

  async leave(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async listMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("entrou_em", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toGroupMember);
  },

  /** Admin adiciona alguém direto ao grupo (sem link de convite). */
  async addMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId, papel: "membro" });
    if (error) throw new Error(error.message);
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async setMemberRole(groupId: string, userId: string, papel: "admin" | "membro"): Promise<void> {
    const { error } = await supabase
      .from("group_members")
      .update({ papel })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  /** Convite ativo do grupo, se houver (um grupo pode ter vários
   * revogados no histórico, mas só um ativo por vez pela convenção da UI). */
  async getActiveInvite(groupId: string): Promise<GroupInvite | null> {
    const { data, error } = await supabase
      .from("group_invites")
      .select("*")
      .eq("group_id", groupId)
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toGroupInvite(data) : null;
  },

  async createInvite(groupId: string, criadoPor: string): Promise<GroupInvite> {
    const { data, error } = await supabase
      .from("group_invites")
      .insert({ group_id: groupId, criado_por: criadoPor })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toGroupInvite(data);
  },

  /** Revoga o link atual — quem já tem o link antigo não consegue mais entrar com ele. */
  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.from("group_invites").update({ ativo: false }).eq("id", inviteId);
    if (error) throw new Error(error.message);
  },

  /** Retorna o group_id do grupo que a pessoa acabou de entrar. */
  async redeemInvite(codigo: string): Promise<string> {
    const { data, error } = await supabase.rpc("redeem_group_invite", { p_codigo: codigo });
    if (error) throw new Error(error.message);
    return data;
  },
};
