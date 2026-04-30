import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { Neo4jService } from './neo4j.service';

@Controller('health')
export class Neo4jHealthController {
  constructor(private readonly neo4jService: Neo4jService) {}

  @Public()
  @Get('neo4j')
  async neo4jHealth() {
    const startedAt = Date.now();

    try {
      await this.neo4jService.ping();

      return {
        status: 'ok',
        service: 'neo4j',
        latencyMs: Date.now() - startedAt,
        circuitBreakerState: this.neo4jService.getCircuitBreakerState(),
      };
    } catch (error: any) {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'neo4j',
        latencyMs: Date.now() - startedAt,
        circuitBreakerState: this.neo4jService.getCircuitBreakerState(),
        message: error?.message || 'Neo4j is unavailable',
      });
    }
  }
}
