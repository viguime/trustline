import mongoose from "mongoose";

const rawUri = process.env.MONGODB_URI;

if (!rawUri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local"
  );
}

const MONGODB_URI: string = rawUri;

/**
 * Cached connection reference stored on the Node.js global object so it
 * survives Next.js hot-module reloads in development without reopening a
 * new connection on every code change.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = (globalThis._mongooseCache ??= { conn: null, promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
