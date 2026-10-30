import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('ISI-Eco Report API')
    .setDescription([
      'API REST versionnée de la plateforme ISI-Eco Report.',
      'Les opérations protégées nécessitent un jeton Supabase Auth et, selon le cas, une habilitation métier.',
    ].join(' '))
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Jeton access_token délivré par Supabase Auth.',
    })
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
  });
}
