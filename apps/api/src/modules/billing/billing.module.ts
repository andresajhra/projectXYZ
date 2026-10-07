import { Module } from "@nestjs/common";
import { FISCAL_ADAPTER } from "./fiscal-adapter";
import { SinAdapter } from "./sin.adapter";

@Module({
  providers: [SinAdapter, { provide: FISCAL_ADAPTER, useExisting: SinAdapter }],
  exports: [FISCAL_ADAPTER],
})
export class BillingModule {}
