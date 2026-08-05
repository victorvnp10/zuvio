import { supabase } from "../client";
import type { AdminDashboardStats } from "../database.types";

export const AdminRepository = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const { data, error } = await supabase.rpc("admin_get_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as AdminDashboardStats;
  },
};
