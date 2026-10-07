import { Injectable } from "@nestjs/common";
import * as soap from "soap";

export interface SoapCallOptions {
  /** Override the endpoint declared in the WSDL (useful for sandbox/production switch). */
  endpoint?: string;
  headers?: Record<string, string>;
  /** Raw SOAP headers (e.g. WS-Security) added to the envelope. */
  soapHeaders?: unknown[];
}

/** Generic SOAP consumer with WSDL client cache. Used by the SIN (fiscal) adapter and any other SOAP service. */
@Injectable()
export class SoapService {
  private readonly clients = new Map<string, Promise<soap.Client>>();

  private getClient(wsdlUrl: string, opts?: SoapCallOptions) {
    const key = `${wsdlUrl}|${opts?.endpoint ?? ""}`;
    let client = this.clients.get(key);
    if (!client) {
      client = soap
        .createClientAsync(wsdlUrl, { endpoint: opts?.endpoint, wsdl_headers: opts?.headers })
        .catch((err) => {
          this.clients.delete(key); // do not cache failures
          throw err;
        });
      this.clients.set(key, client);
    }
    return client;
  }

  async call<TResult = unknown>(
    wsdlUrl: string,
    operation: string,
    args: Record<string, unknown>,
    opts?: SoapCallOptions,
  ): Promise<TResult> {
    const client = await this.getClient(wsdlUrl, opts);
    opts?.soapHeaders?.forEach((h) => client.addSoapHeader(h as object));
    const fn = (client as unknown as Record<string, unknown>)[`${operation}Async`];
    if (typeof fn !== "function") throw new Error(`SOAP operation "${operation}" not found in ${wsdlUrl}`);
    const [result] = await (fn as (a: unknown, o?: unknown) => Promise<[TResult]>).call(client, args, {
      headers: opts?.headers,
    });
    client.clearSoapHeaders();
    return result;
  }

  async describe(wsdlUrl: string) {
    return (await this.getClient(wsdlUrl)).describe();
  }
}
