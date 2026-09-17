import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/dts-website', { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;
const cols = await db.listCollections().toArray();
console.log(`== DB: ${db.databaseName} ==`);
if (cols.length === 0) console.log('  (no collections)');
for (const c of cols) {
  const count = await db.collection(c.name).countDocuments();
  console.log(`  - ${c.name}: ${count} docs`);
}
await mongoose.disconnect();
console.log('done');