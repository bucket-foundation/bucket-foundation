export interface DeleteAccountClients {
  getUser: (accessToken: string) => Promise<{ id: string | null; status: number | null }>;
  deleteRows: (table: string, userId: string) => Promise<{ failed: boolean }>;
  deleteUser: (userId: string) => Promise<{ status: number | null }>;
  revokeApple?: (userId: string) => Promise<void>;
}

export const PERSONAL_TABLES = ["academy_progress", "academy_profiles"];

export async function deleteAccount(clients: DeleteAccountClients, accessToken: string): Promise<{ status: number | null }> {
  const who = await clients.getUser(accessToken);
  if (!who.id) return { status: who.status === 401 || who.status === 403 || who.status === null ? 401 : who.status };
  if (clients.revokeApple) await clients.revokeApple(who.id);
  for (const table of PERSONAL_TABLES) {
    if ((await clients.deleteRows(table, who.id)).failed) return { status: 500 };
  }
  const removed = await clients.deleteUser(who.id);
  return { status: removed.status === null ? null : removed.status };
}
