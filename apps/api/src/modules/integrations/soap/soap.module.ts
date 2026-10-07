import { Global, Module } from "@nestjs/common";
import { SoapService } from "./soap.service";

@Global()
@Module({ providers: [SoapService], exports: [SoapService] })
export class SoapModule {}
