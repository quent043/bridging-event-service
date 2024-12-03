import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// TODO
// Finish general setup
// Prisma models (event data; data aggregator with percentages etc)
// Install service event listener with simple logs
// Create extra controller for event data OR live stream or websocket canal
// Implement Redis ===> Where do we store data with redis ?
// How much historical data do we store ?
// Do we index past data first ?
// Extra: Add custom error
// Extra: Add Demo frontend

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
