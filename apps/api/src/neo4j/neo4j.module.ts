import { Global, Module } from '@nestjs/common';
import { Neo4jHealthController } from 'src/neo4j/neo4j-health.controller';
import { Neo4jInitService } from 'src/neo4j/neo4j-init.service';
import { Neo4jService } from 'src/neo4j/neo4j.service';

@Global()
@Module({
  providers: [Neo4jService, Neo4jInitService],
  controllers: [Neo4jHealthController],
  exports: [Neo4jService],
})
export class Neo4jModule {}
