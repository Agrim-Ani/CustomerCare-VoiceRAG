/* Simple structured logger wrapper. Extend with pino/winston if needed. */
export const log = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: "error", msg, ...meta }))
};
