// import { ConsoleLogger, LoggerService } from '@nestjs/common';
// import { inspect } from 'util';

// export class SafeLogger extends ConsoleLogger implements LoggerService {
//   private formatParam(value: unknown): string {
//     if (value instanceof Error) {
//       return value.stack || value.message || 'Error';
//     }

//     if (typeof value === 'bigint') {
//       return value.toString();
//     }

//     if (typeof value === 'string') {
//       return value;
//     }

//     return inspect(value, {
//       depth: 2,
//       maxArrayLength: 20,
//       breakLength: 120,
//       compact: true,
//       maxStringLength: 2000,
//     });
//   }

//   private formatValues(values: unknown[]): string {
//     return values.map((value) => this.formatParam(value)).join(' ');
//   }

//   private extractContext(optionalParams: unknown[]) {
//     if (optionalParams.length === 0) {
//       return { context: undefined as string | undefined, params: [] as unknown[] };
//     }

//     const last = optionalParams[optionalParams.length - 1];
//     if (typeof last === 'string') {
//       return {
//         context: last,
//         params: optionalParams.slice(0, -1),
//       };
//     }

//     return { context: undefined as string | undefined, params: optionalParams };
//   }

//   override log(message: unknown, ...optionalParams: unknown[]): void {
//     const { context, params } = this.extractContext(optionalParams);
//     super.log(this.formatValues([message, ...params]), context);
//   }

//   override warn(message: unknown, ...optionalParams: unknown[]): void {
//     const { context, params } = this.extractContext(optionalParams);
//     super.warn(this.formatValues([message, ...params]), context);
//   }

//   override debug(message: unknown, ...optionalParams: unknown[]): void {
//     const { context, params } = this.extractContext(optionalParams);
//     super.debug(this.formatValues([message, ...params]), context);
//   }

//   override verbose(message: unknown, ...optionalParams: unknown[]): void {
//     const { context, params } = this.extractContext(optionalParams);
//     super.verbose(this.formatValues([message, ...params]), context);
//   }

//   override error(message: unknown, trace?: unknown, context?: string): void {
//     const formattedMessage = this.formatValues([message]);
//     const formattedTrace = trace ? this.formatParam(trace) : undefined;
//     super.error(formattedMessage, formattedTrace, context);
//   }
// }
