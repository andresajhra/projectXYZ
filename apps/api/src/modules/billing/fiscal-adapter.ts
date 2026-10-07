/** Contract every fiscal backend must implement (SIN Bolivia first; others can be added per country). */
export interface FiscalAdapter {
  issue(input: { xml: string }): Promise<{ accepted: boolean; reference?: string }>;
  cancel(input: { reference: string; reason: string }): Promise<void>;
  // TODO: getCuis, getCufd, registerEvent, sendPackage, creditNote, status (see blueprint)
}
export const FISCAL_ADAPTER = Symbol("FISCAL_ADAPTER");
