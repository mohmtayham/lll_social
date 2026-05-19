// import fs from 'fs';
// import path from 'path';

// type WriteChunk = string | Uint8Array;

// type WriteFunction = (chunk: WriteChunk, encoding?: BufferEncoding, cb?: (err?: Error) => void) => boolean;

// const suppressMarkers = [
//   '_tracingHelper',
//   '_runtimeDataModel',
//   '_engineConfig',
//   'PrismaClient',
//   'BullQueue_',
//   'moduleRef',
//   'requestHandler',
// ];

// const shouldSuppress = (text: string): boolean => {
//   return suppressMarkers.some((marker) => text.includes(marker));
// };

// const appendTrace = (source: string, sample: string): void => {
//   const trace = new Error().stack || 'no stack';
//   const logPath = path.resolve(process.cwd(), 'prisma-dump-trace.log');
//   const payload = [
//     `[${new Date().toISOString()}] ${source}`,
//     trace,
//     '--- sample ---',
//     sample.slice(0, 2000),
//     '--- end ---',
//     '',
//   ].join('\n');

//   try {
//     fs.appendFileSync(logPath, payload, { encoding: 'utf8' });
//   } catch {
//     // Ignore trace failures to avoid breaking app logging.
//   }
// };

// const wrapStreamWrite = (source: string, write: WriteFunction): WriteFunction => {
//   return (chunk, encoding, cb) => {
//     const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);

//     if (shouldSuppress(text)) {
//       appendTrace(source, text);
//       return write('[suppressed prisma dump - see prisma-dump-trace.log]\n', 'utf8', cb);
//     }

//     return write(chunk, encoding, cb);
//   };
// };

// export const patchStdIoForSafeInspect = (): void => {
//   process.stdout.write = wrapStreamWrite('stdout', process.stdout.write.bind(process.stdout));
//   process.stderr.write = wrapStreamWrite('stderr', process.stderr.write.bind(process.stderr));
// };
