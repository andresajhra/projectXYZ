import { Controller, Get } from "@nestjs/common";
import type { HelloResponse } from "@pharma/contracts";
import { PrismaService } from "../../prisma/prisma.service";

@Controller()
export class HelloController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(["", "hello"])
  async hello(): Promise<HelloResponse> {
    let database: HelloResponse["database"] = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return {
      message: "Hello from NestJS",
      service: "@pharma/api",
      time: new Date().toISOString(),
      database,
    };
  }
}
