import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { PUBLIC_UPLOADS_PREFIX, UPLOADS_ROOT, ensureMediaUploadsDir } from './media/media-storage';
// import { SafeLogger } from './common/logger/safe-logger.service';
// import { patchConsoleForSafeInspect } from './common/logger/console-sanitizer';
// import { patchStdIoForSafeInspect } from './common/logger/stdio-sanitizer';

async function bootstrap() {
  // patchStdIoForSafeInspect();
  // patchConsoleForSafeInspect();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // app.useLogger(new SafeLogger());

  const allowedOrigins = process.env.WEB_URL
    ? process.env.WEB_URL.split(',').map((origin) => origin.trim())
    : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  ensureMediaUploadsDir();
  app.set('trust proxy', 1);
  app.useStaticAssets(UPLOADS_ROOT, {
    prefix: `${PUBLIC_UPLOADS_PREFIX}/`,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // ─── Swagger Setup ───────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Social API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',   // ← اسم الـ security scheme
    )
    .build();
    

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: false,
    ignoreGlobalPrefix: false,
      include: [],  // ← اتركها فاضية مؤقتاً لو حبيت تختبر
  });

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,   // ← يحفظ الـ Token بعد Refresh
    },
  });
  // ─────────────────────────────────────────────────────

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 8000);

  console.log(`🚀 Server:  http://localhost:${process.env.PORT ?? 8000}`);
  console.log(`📘 Swagger: http://localhost:${process.env.PORT ?? 8000}/api-docs`);
}

bootstrap();
