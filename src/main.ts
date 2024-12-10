import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [process.env.FRONTEND_URL || '', 'http://localhost:3001'],
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();

// Graceful shutdown on uncaught exceptions or unhandled rejections
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // PM2 will restart the app
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
