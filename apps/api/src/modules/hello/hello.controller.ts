import { Controller, Get } from "@nestjs/common";
import type { HelloResponse } from "@pharma/contracts";
import { Public } from "../../common/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("hello")
export class HelloController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async hello(): Promise<HelloResponse> {
    let database: HelloResponse["database"] = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return { message: "Hello from NestJS", service: "@pharma/api", time: new Date().toISOString(), database };
  }
}
