import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { HelloModule } from "./modules/hello/hello.module";
import { BankModule } from "./modules/integrations/bank/bank.module";
import { MailModule } from "./modules/integrations/mail/mail.module";
import { SignatureModule } from "./modules/integrations/signature/signature.module";
import { SoapModule } from "./modules/integrations/soap/soap.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    MailModule,
    SoapModule,
    SignatureModule,
    BankModule,
    BillingModule,
    AuthModule,
    HelloModule,
  ],
})
export class AppModule {}
