import buffer from "node:buffer";
// Polyfill SlowBuffer for Node 22/24/26 compatibility with jsonwebtoken
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = class SlowBuffer extends buffer.Buffer {};
}

import app from "../backend/index.js";

export default app;
