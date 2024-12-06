import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// TODO
// Refine start command for deploy ===> Prisma migrate deploy ?
// Live updates
// Extra: Add Demo frontend

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
