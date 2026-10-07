import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config.getOrThrow<string>("WEB_ORIGINS").split(",").map((s) => s.trim()),
    credentials: true,
  });

  const port = config.getOrThrow<number>("PORT");
  await app.listen(port);
  console.log(`API ready on http://localhost:${port}/api`);
}
void bootstrap();
