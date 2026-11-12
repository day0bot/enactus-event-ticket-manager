import buffer from "node:buffer";

// Polyfill SlowBuffer for Node.js 22/24/26 compatibility with jsonwebtoken / buffer-equal-constant-time
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = class SlowBuffer extends buffer.Buffer {};
}
