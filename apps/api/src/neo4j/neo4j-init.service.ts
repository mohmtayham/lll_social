// src/neo4j/neo4j-init.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';

@Injectable()
export class Neo4jInitService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jInitService.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    // const isProduction = process.env.NODE_ENV === 'production';
    // const shouldInitOnBoot = process.env.NEO4J_INIT_ON_BOOT === 'true' || isProduction;
    // if (!shouldInitOnBoot) {
    //   this.logger.log('Skipping Neo4j index/constraint bootstrap (set NEO4J_INIT_ON_BOOT=true to enable).');
    //   return;
    // }

    const constraints = [
      `CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE`,
      `CREATE CONSTRAINT post_id_unique IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE`,
      `CREATE CONSTRAINT interest_name_unique IF NOT EXISTS FOR (i:Interest) REQUIRE i.name IS UNIQUE`,
      `CREATE INDEX post_status_idx IF NOT EXISTS FOR (p:Post) ON (p.status)`,
      `CREATE INDEX interaction_updated_idx IF NOT EXISTS FOR ()-[r:INTERACTED_WITH]->() ON (r.updatedAt)`,
    ];

    for (const cypher of constraints) {
      try {
        await this.neo4j.write(cypher);
        this.logger.log(`✅ Applied: ${cypher.split(' ')[2]}`);
      } catch (err: any) {
        // تجاهل أخطاء التكرار أو الإصدارات القديمة التي لا تدعم IF NOT EXISTS
        if (!err.message?.includes('already exists')) {
          this.logger.warn(`⚠️ Constraint/Index warning: ${err.message}`);
        }
      }
    }
  }
}