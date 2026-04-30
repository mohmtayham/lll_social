import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { CircuitBreaker } from 'src/common/circuit-breaker';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  private readonly driver: Driver;
  private readonly logger = new Logger(Neo4jService.name);
  private readonly circuitBreaker = new CircuitBreaker(5, 30000);

  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'neo4j://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password',
      ),
    );
  }

  private createSession(mode: 'READ' | 'WRITE'): Session {
    const database = process.env.NEO4J_DATABASE || undefined;
    return this.driver.session({
      database,
      defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
    });
  }

  async read<T = any>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
    return this.circuitBreaker.execute(async () => {
      const session = this.createSession('READ');
      try {
        const result = await session.executeRead((tx) => tx.run(cypher, params));
        return result.records.map((record) => record.toObject() as T);
      } catch (error: any) {
        this.logger.warn(`Neo4j read failed: ${error?.message || 'unknown error'}`);
        throw error;
      } finally {
        await session.close();
      }
    });
  }

  async write(cypher: string, params: Record<string, any> = {}): Promise<void> {
    await this.circuitBreaker.execute(async () => {
      const session = this.createSession('WRITE');
      try {
        await session.executeWrite((tx) => tx.run(cypher, params));
      } catch (error: any) {
        this.logger.warn(`Neo4j write failed: ${error?.message || 'unknown error'}`);
        throw error;
      } finally {
        await session.close();
      }
    });
  }

  async ping(): Promise<void> {
    await this.read('RETURN 1 AS ok');
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  async onModuleDestroy(): Promise<void> {
    await this.driver.close();
  }
}
