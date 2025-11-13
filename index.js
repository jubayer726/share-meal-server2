const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-adminsdk.json");
require("dotenv").config();

const app = express();
const port = 3000;


//  Middleware
app.use(cors());
app.use(express.json());


//  Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


//  MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.t8kbwcq.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized access. Token not Found" });
  }

  const token = authorization.split(" ")[1];

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({ message: "Unauthorized access." });
  }
};


// Main Function
async function run() {
  try {
    // await client.connect();
    const db = client.db("share-meal");
    const foodCollection = db.collection("foods");
    const foodRequestCollection = db.collection("requests");

    // Home Page - Limited Foods
    app.get("/foods", async (req, res) => {
      const result = await foodCollection
        .find()
        .sort({ food_quantity: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    //  All Available Foods
    app.get("/available-foods", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });

  
    //  Add Food
    app.post("/foods", async (req, res) => {
      const data = req.body;
      const result = await foodCollection.insertOne(data);
      res.send(result);
    });


    // Food Details 
    app.get("/foods/:id", async (req, res) => {
      const { id } = req.params;
      const result = await foodCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Update Food
    app.put("/foods/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: data };
      const result = await foodCollection.updateOne(filter, update);
      res.send({ success: true, result });
    });

 
    // Manage Foods 
    app.get("/manage-foods", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await foodCollection.find({ created_by: email }).toArray();
      res.send(result);
    });

 
    // Delete Food
    app.delete("/foods/:id", async (req, res) => {
      const { id } = req.params;
      const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

 
    // Search Foods
    app.get("/search", async (req, res) => {
      const search_text = req.query.search;
      const result = await foodCollection
        .find({ food_name: { $regex: search_text, $options: "i" } })
        .toArray();
      res.send(result);
    });


    //Requiest
    app.post('/requiests/:id', async (req, res)=>{
      const data = req.body;
      const id = req.params.id;
      const result = await foodRequestCollection.insertOne(data);
      const filter = {_id: new ObjectId(id)};
      const update = {
        $inc: {
          requiests: 1
        }
      }
      const requiestCounted = await foodRequestCollection.updateOne(filter, update);
      res.send(result, requiestCounted);
    })

    // Requested Foods 
    app.get("/my-requests", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await foodRequestCollection.find({requester_email: email}).toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Share Meal Server is Running...!");
});

app.listen(port, () => {
  console.log(`Server is Running on port ${port}`);
});
