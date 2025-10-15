const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug: (...args) => {
    if (isDev) {
      console.debug("[RR]", ...args);
    }
  },
  info: (...args) => {
    console.info("[RR]", ...args);
  },
  warn: (...args) => {
    console.warn("[RR]", ...args);
  },
  error: (...args) => {
    console.error("[RR]", ...args);
  }
};

export default logger;
