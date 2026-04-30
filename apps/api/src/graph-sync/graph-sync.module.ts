import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Neo4jModule } from 'src/neo4j/neo4j.module';
import { GraphSyncProcessor } from './graph-sync.processor';

@Module({
  imports: [
    Neo4jModule,
    BullModule.registerQueue({
      name: 'graph-sync',
    }),
  ],
  providers: [GraphSyncProcessor],
})
export class GraphSyncModule {}
