const express = require('express');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb'); // Import ObjectId
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ...........
const assetDB = "Asset";

console.log(process.env.DB_USER, process.env.DB_PASS);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vhtgohj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    // My Collection
    const userCollection = client.db(assetDB).collection("user");
    const assetCollection = client.db(assetDB).collection("asset");
    const customCollection = client.db(assetDB).collection("custom");

    // jwt created......
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token });
    });

    // verify token and admin..........
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      try {
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send('message', 'forbidden access');
        }
        next();
      } catch (error) {
        console.error('Error verifying admin:', error);
        res.status(500).send('Internal Server Error');
      }
    };

    // user related API working for admin and user.................

    app.get('/user', async (req, res) => {
      console.log(req.headers);
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // user retrieving working
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send('message', 'forbidden access');
      }
      const query = { email: email };
      try {
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === 'admin';
        }
        res.send({ admin });
      } catch (error) {
        console.error('Error retrieving user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // user creation work..............
    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      try {
        const exitUser = await userCollection.findOne(query);
        if (exitUser) {
          return res.send({ message: 'user already exists', insertedId: null });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // user updated work
    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      };
      try {
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // user deletion...........
    app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // Asset releted API
    app.get('/asset', async (req, res) => {
        const result = await assetCollection.find().toArray();
        res.send(result);
      });
  
      app.get('/asset/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await assetCollection.findOne(query);
        res.send(result);
      })
  
      app.post('/asset',  async (req, res) => {
        const item = req.body;
        const result = await assetCollection.insertOne(item);
        res.send(result);
      });
      app.delete('/asset/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assetCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/asset/:id', async (req, res) => {
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
          $set: {
            product: item.product,
            type: item.type,
            quantity: item.quantity,
            date: item.date
            
          }
        }
  
        const result = await assetCollection.updateOne(filter, updatedDoc)
        res.send(result);
      })



  // Custom Request make 
  app.get('/custom', async (req, res) => {
    const result = await customCollection.find().toArray();
    res.send(result);
  });
  app.post('/custom',  async (req, res) => {
    const item = req.body;
    const result = await customCollection.insertOne(item);
    res.send(result);
  })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run();

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

// Define your routes or other logic using the collections
app.get('/', (req, res) => {
  res.send('Hello World!');
});
