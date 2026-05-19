// import { inspect } from 'util';

// type ConsoleMethod = (...args: unknown[]) => void;

// type InspectOptions = {
//   depth: number;
//   maxArrayLength: number;
//   breakLength: number;
//   compact: boolean;
//   maxStringLength: number;
// };

// const inspectOptions: InspectOptions = {
//   depth: 2,
//   maxArrayLength: 20,
//   breakLength: 120,
//   compact: true,
//   maxStringLength: 2000,
// };

// const formatValue = (value: unknown): string => {
//   if (value instanceof Error) {
//     return value.stack || value.message || 'Error';
//   }

//   if (typeof value === 'bigint') {
//     return value.toString();
//   }

//   if (typeof value === 'string') {
//     return value;
//   }

//   return inspect(value, inspectOptions);
// };

// const wrapConsoleMethod = (method: ConsoleMethod): ConsoleMethod => {
//   return (...args: unknown[]) => {
//     if (args.length === 0) {
//       return method();
//     }

//     if (typeof args[0] === 'string') {
//       const [first, ...rest] = args;
//       return method(first, ...rest.map(formatValue));
//     }

//     return method(args.map(formatValue).join(' '));
//   };
// };

// export const patchConsoleForSafeInspect = (): void => {
//   console.log = wrapConsoleMethod(console.log.bind(console));
//   console.info = wrapConsoleMethod(console.info.bind(console));
//   console.warn = wrapConsoleMethod(console.warn.bind(console));
//   console.error = wrapConsoleMethod(console.error.bind(console));
//   console.debug = wrapConsoleMethod(console.debug.bind(console));
// };
