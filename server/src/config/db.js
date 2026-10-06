import mongoose from "mongoose";

// Indexes must not be able to hold the process hostage. If the database stops
// responding mid-build, awaiting forever would leave the server never listening
// on its port - a stall that looks like an app outage rather than a slow index.
const INDEX_TIMEOUT_MS = 15000;
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms).unref?.()
    ),
  ]);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Index creation is not a background nicety here - it is what every search,
    // roster list and dashboard count in this app relies on. Mongoose defaults
    // autoIndex to true and builds them on connect, but a build that fails emits
    // an 'index' error event that nobody listens for, so a query would keep
    // returning correct results while silently degrading to a full collection
    // scan. Nothing would look broken.
    //
    // So the failure is surfaced loudly instead of being swallowed.
    // Mongoose emits 'index' with no argument on a successful build, so only
    // log when an actual error is present - otherwise a healthy server crashes
    // on the first finished index.
    for (const model of Object.values(mongoose.models)) {
      model.on("index", (error) => {
        if (!error) return;
        console.error(`Index build failed on ${model.modelName}:`, error.message);
      });
    }

    // Gives each model a chance to finish and reports what actually exists,
    // rather than assuming the connection carrying an autoIndex flag means the
    // indexes landed. A timeout here is reported and swallowed - the query still
    // works, it just falls back to scanning.
    try {
      await withTimeout(
        mongoose.connection.db.admin().ping(),
        INDEX_TIMEOUT_MS,
        "Database ping"
      );
      const built = await withTimeout(
        Promise.all(
          Object.values(mongoose.models).map(async (model) => {
            try {
              await model.init();
              const counts = await model.listIndexes();
              return { name: model.modelName, count: counts.length };
            } catch (error) {
              return { name: model.modelName, count: -1, error: error.message };
            }
          })
        ),
        INDEX_TIMEOUT_MS,
        "Index creation"
      );
      const failed = built.filter((entry) => entry.error);
      const summary = built
        .map((entry) => (entry.error ? `${entry.name}=FAILED` : `${entry.name}=${entry.count}`))
        .join(" ");
      console.log(`Indexes ready: ${summary}`);
      if (failed.length) {
        console.error(
          `${failed.length} model(s) failed index creation. Queries on them will still work but will scan.`
        );
      }
    } catch (error) {
      console.error(`Index verification skipped: ${error.message}`);
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;