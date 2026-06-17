const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://addepallipavani4_db_user:fwcMA4LWNzPVYuRR@qehr8hm.mongodb.net/athithigriha?retryWrites=true&w=majority";

async function run() {
  try {
    console.log("Connecting...");
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log("Connected successfully to server");
    await client.close();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}
run();
