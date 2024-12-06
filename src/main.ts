import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// TODO
// Refine start command for deploy ===> Prisma migrate deploy ?
// Live updates
// Extra: Add Demo frontend

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:5000',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
