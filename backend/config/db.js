import mongoose from "mongoose";
import dns from "node:dns";

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
// ONLY apply custom public DNS in local development environments, NEVER on Vercel/Lambda where port 53 outbound is blocked
if (!process.env.VERCEL && !process.env.AWS_REGION && !process.env.LAMBDA_TASK_ROOT) {
  try {
    dns.setDefaultResultOrder?.("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (e) {
    // Ignore if custom DNS cannot be applied
  }
}

// Global cached connection for serverless warm execution (standard Vercel/AWS Lambda pattern)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI || "mongodb+srv://ejouiniy_db_user:EJR7reXTFH72J5IN@enactus0ticket.14reowa.mongodb.net/enactus_ticketing?retryWrites=true&w=majority";
    if (!uri) {
      throw new Error("MONGO_URI is not defined in the environment variables");
    }

    const opts = {
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(uri, opts).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (!process.env.VERCEL) {
      // Don't kill serverless function processes
    }
    throw error;
  }
};

export default connectDB;
