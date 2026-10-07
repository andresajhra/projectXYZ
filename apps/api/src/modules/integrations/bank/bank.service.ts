import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "node:fs";
import { SignatureService } from "../signature/signature.service";

/**
 * Base client for a bank REST API that requires signed requests.
 * Replace `createCharge` with the real contract of the bank you integrate (e.g. interoperable QR).
 */
@Injectable()
export class BankService {
  constructor(private readonly config: ConfigService, private readonly signatures: SignatureService) {}

  private get privateKey() {
    const path = this.config.get<string>("BANK_PRIVATE_KEY_PEM_PATH");
    if (!path) throw new ServiceUnavailableException("BANK_PRIVATE_KEY_PEM_PATH is not configured");
    return readFileSync(path, "utf8");
  }

  async signedPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    const baseUrl = this.config.get<string>("BANK_API_URL");
    if (!baseUrl) throw new ServiceUnavailableException("BANK_API_URL is not configured");

    const payload = JSON.stringify(body);
    const signature = this.signatures.signPayload(payload, this.privateKey);

    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": signature },
      body: payload,
    });
    if (!res.ok) throw new ServiceUnavailableException(`Bank API responded ${res.status}`);
    return (await res.json()) as T;
  }

  createCharge(input: { reference: string; amount: number; currency: "BOB" | "USD" }) {
    return this.signedPost("/charges", input);
  }
}
