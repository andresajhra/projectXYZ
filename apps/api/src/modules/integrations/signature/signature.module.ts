import { Global, Module } from "@nestjs/common";
import { SignatureService } from "./signature.service";

@Global()
@Module({ providers: [SignatureService], exports: [SignatureService] })
export class SignatureModule {}
