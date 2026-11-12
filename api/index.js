import "./polyfill.js";

// Dynamically import backend after polyfill is guaranteed to be in memory
const appModule = await import("../backend/index.js");
const app = appModule.default;

export default app;
