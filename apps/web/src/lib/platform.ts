/** True when running inside the Tauri desktop shell. */
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Calls the Rust `hello` command. Hardware ports (printer, drawer, scale) will follow this same pattern. */
export async function tauriHello(name: string): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("hello", { name });
}
