import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend?: Resend;
  private readonly from: string;

  constructor(config: ConfigService) {
    const key = config.get<string>("RESEND_API_KEY");
    this.resend = key ? new Resend(key) : undefined;
    this.from = config.getOrThrow<string>("MAIL_FROM");
  }

  async send(opts: { to: string | string[]; subject: string; html: string }) {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not set. Email to ${opts.to} skipped: "${opts.subject}"`);
      return;
    }
    const { error } = await this.resend.emails.send({ from: this.from, ...opts });
    if (error) this.logger.error(`Resend error: ${error.message}`);
  }

  welcome(to: string, name: string) {
    return this.send({
      to,
      subject: "Welcome to Pharma ERP",
      html: `<p>Hi ${name},</p><p>Your pharmacy account is ready. You can sign in now.</p>`,
    });
  }
}
