import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { QualificationModule } from './modules/qualification/qualification.module.js';
import { CasesModule } from './modules/cases/cases.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';
import { InterventionsModule } from './modules/interventions/interventions.module.js';
import { VerificationModule } from './modules/verification/verification.module.js';
import { ReferentialsModule } from './modules/referentials/referentials.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule, AuthModule, HealthModule, AccountsModule, ReportsModule,
    QualificationModule, CasesModule, AssignmentsModule, InterventionsModule,
    VerificationModule, ReferentialsModule, AuditModule,
  ],
})
export class AppModule {}
