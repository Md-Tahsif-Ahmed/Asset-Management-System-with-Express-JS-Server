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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    // My Collection
    const userCollection = client.db(assetDB).collection("user");
    const assetCollection = client.db(assetDB).collection("asset");
    const customCollection = client.db(assetDB).collection("custom");
    const requestCollection = client.db(assetDB).collection("request");

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
        // return res.status(401).send({ message: 'forbidden access' });
        return res.send({ message: 'forbidden access' });

      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          // return res.status(401).send({ message: 'forbidden access' });
          return res.send({ message: 'forbidden access' });

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
          // return res.status(403).send('message', 'forbidden access');
          return res.send({ message: 'forbidden access' });

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
        // return res.status(403).send('message', 'forbidden access');
        return res.send({ message: 'forbidden access' });

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
    app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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
      const {assetType, searchTerm, sortBy} = req.query;

      // Initialize filter as an empty object
      const filter = {};
      if (assetType) {
          filter.type = assetType;
      }
      if (searchTerm) {
          filter.$or = [
              { product: { $regex: searchTerm, $options: 'i' } },
              
          ];
      }
     
      const sortOption = {};
      if (sortBy === 'asc' || sortBy === 'dsc') {
          sortOption.quantity = sortBy === 'asc' ? 1 : -1;
      }
        const result = await assetCollection.find({...filter}).sort(sortOption).toArray();
        res.send(result);
      });
  
      app.get('/asset/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await assetCollection.findOne(query);
        res.send(result);
      })
  
      app.post('/asset', verifyToken, verifyAdmin, async (req, res) => {
        const item = req.body;
        const result = await assetCollection.insertOne(item);
        res.send(result);
      });
      app.delete('/asset/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assetCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/asset/:id', verifyToken, verifyAdmin, async (req, res) => {
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
  app.get('/custom/:email', async (req, res) => {
    const email = req.params.email;
    const cursor = customCollection.find({email:email});
    const result = await cursor.toArray();
    res.send(result);
  });
  app.patch('/custom/:id', async (req, res) => {
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
          $set: {
            asset: item.asset,
            type: item.type,
            price: item.price,
            why: item.why,
            adinfo: item.adinfo,
            image: item.image,
            date: item.date
            
          }
        }
  
        const result = await customCollection.updateOne(filter, updatedDoc)
        res.send(result);
      })

      // for approve custom request.
      app.patch('/custom/approve/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
            $set: {
                status: 'Approved',
                Approval_date: new Date(), // Assuming you want to set the current date
            },
        };
    
        try {
            const result = await customCollection.updateOne(filter, updatedDoc);
    
            if (result.modifiedCount > 0) {
                res.send({ success: true });
            } else {
                res.send({ success: false, message: 'No document modified' });
            }
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).send({ success: false, message: 'Internal server error' });
        }
    });
    app.patch('/custom/reject/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
          $set: {
              status: 'Rejected',
              reject_date: new Date(), // Assuming you want to set the current date
          },
      };
  
      try {
          const result = await customCollection.updateOne(filter, updatedDoc);
  
          if (result.modifiedCount > 0) {
              res.send({ success: true });
          } else {
              res.send({ success: false, message: 'No document modified' });
          }
      } catch (error) {
          console.error('Error:', error.message);
          res.status(500).send({ success: false, message: 'Internal server error' });
      }
  });


    // Request for asset funtionality API,
    app.get('/myreq', async (req, res) => {
      const {searchTerm} = req.query;

      // Initialize filter as an empty object
      const filter = {};
      if (searchTerm) {
          filter.$or = [
              { email: { $regex: searchTerm, $options: 'i' } },
              
          ];
      }
      const result = await requestCollection.find({...filter}).toArray();
      // const count = await requestCollection.estimatedDocumentCount();
      res.send(result);
    });
    app.post('/myreq',  async (req, res) => {
      const item = req.body;
      const result = await requestCollection.insertOne(item);
      res.send({result, count});
    });
    app.patch('/myreq/approve/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
          $set: {
              status: 'approved',
              Approval_date: new Date(), // Assuming you want to set the current date
          },
      };
  
      try {
          const result = await requestCollection.updateOne(filter, updatedDoc);
  
          if (result.modifiedCount > 0) {
              res.send({ success: true });
          } else {
              res.send({ success: false, message: 'No document modified' });
          }
      } catch (error) {
          console.error('Error:', error.message);
          res.status(500).send({ success: false, message: 'Internal server error' });
      }
  });

  app.patch('/myreq/reject/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            status: 'Rejected',
            reject_date: new Date(), // Assuming you want to set the current date
        },
    };

    try {
        const result = await requestCollection.updateOne(filter, updatedDoc);

        if (result.modifiedCount > 0) {
            res.send({ success: true });
        } else {
            res.send({ success: false, message: 'No document modified' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send({ success: false, message: 'Internal server error' });
    }
});

  // My request by email search and filter funtionality
  app.get('/myreq/:email', async (req, res) => {
    const email = req.params.email;
    const { status, assetType, searchTerm } = req.query;

    // Initialize filter as an empty object
    const filter = {};

    if (status) {
        filter.status = status;
    }
    if (assetType) {
        filter.type = assetType;
    }
    if (searchTerm) {
        filter.$or = [
            { asset: { $regex: searchTerm, $options: 'i' } },
            { requestDate: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    // Fetch data based on the filter
    const cursor = requestCollection.find({ email: email, ...filter });
    const result = await cursor.toArray();
    res.send(result);
});

  app.delete('/myreq/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await requestCollection.deleteOne(query);
    res.send(result);
  })
  app.patch('/myreq/return/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            status: 'returned',
            Return_date: new Date(), // Assuming you want to set the current date
        },
    };
 
    const result = await requestCollection.updateOne(filter, updatedDoc);
    res.send(result);
         
     
});
app.patch('/asset/quantity/:asset', async (req, res) => {
  const assetName = req.params.asset;
  const filter = { product: assetName };

  try {
    // Fetch the current quantity from the database
    const asset = await assetCollection.findOne(filter);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const currentQuantity = parseInt(asset.quantity, 10);
    


    // Update the document with the incremented quantity and the current date
    const result = await assetCollection.updateOne(
      filter,
      {
        $set: {
          quantity: currentQuantity + 1,
          quantity_Date: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      // Return a more informative response, e.g., updated asset details
      const updatedAsset = await assetCollection.findOne(filter);
      res.status(200).json({ success: true, updatedAsset });
    } else {
      res.status(500).json({ error: 'Failed to update quantity' });
    }
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

    
    
    


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
