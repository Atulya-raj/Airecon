import path from "path";
import { LocalReconStore } from "./local";
import { SupabaseReconStore, createSupabaseClient } from "./supabase";
import type { ReconStore } from "./types";

export * from "./types";
export { LocalReconStore } from "./local";
export { SupabaseReconStore } from "./supabase";

let store: ReconStore | null = null;

/**
 * Supabase when configured, otherwise a JSON-file store so the app runs
 * end-to-end locally without provisioning a database.
 */
export function getReconStore(): ReconStore {
  if (store) return store;
  const client = createSupabaseClient();
  store = client
    ? new SupabaseReconStore(client)
    : new LocalReconStore(path.join(process.cwd(), ".local-recon-db.json"));
  return store;
}

export function setReconStore(next: ReconStore | null): void {
  store = next;
}
