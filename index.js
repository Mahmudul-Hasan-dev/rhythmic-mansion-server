const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.seykns5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const userCollection = client.db("rhythmicDB").collection("users");
    const classCollection = client.db("rhythmicDB").collection("classes");
    const instructorCollection = client.db("rhythmicDB").collection("instructors");
    const cartCollection =client.db("rhythmicDB").collection("carts");

      // jwt related api
      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
      })

      // middlewares 
 const verifyToken = (req, res, next) => {
  console.log('inside verify token', req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  })
}

// ======= Users collection ====/


// show user
  app.get('/users', verifyToken,  async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
  });

  // save user
    app.post('/users', async (req, res) => {
      const user = req.body;
     const query = { email: user.email }
       const existingUser = await userCollection.findOne(query);
     if (existingUser) {
         return res.send({ message: 'user already exists', insertedId: null })
       }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get admin 
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    // make admin
    app.patch('/users/admin/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.get('/users/instructor/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let instructor = false;
      if (user) {
        instructor = user?.role === 'instructor';
      }
      res.send({ instructor });
    })

    //make instructor
    app.patch('/users/instructor/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })



    //Class collection 
    app.get('/classes', async(req, res) =>{
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    
    app.get('/top-classes', async(req, res) =>{
      
      const allClasses = await classCollection.find({}).toArray();
      const topClasses = allClasses
      .map(cls => ({
        ...cls,
        studentCount: cls.students
      }))
      .sort((a, b) => b.studentCount - a.studentCount)
       .slice(0, 6);
  
      res.send(topClasses);
  })

  app.post('/class', verifyToken, async (req, res) => {
    const item = req.body;
    const result = await classCollection.insertOne(item);
    res.send(result);
  });

  app.delete('/class/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await classCollection.deleteOne(query);
    res.send(result);
  })
  
//instructors
app.get('/instructors', async(req, res) =>{
  const result = await instructorCollection.find().toArray();
  res.send(result);
})

// select class
app.get('/carts',verifyToken , async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email
  if(email !== decodedEmail)
  {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const query = { email: email };
  const result = await cartCollection.find(query).toArray();
  res.send(result);
});

app.post('/carts', async (req, res) => {
  const cartItem = req.body;
  const result = await cartCollection.insertOne(cartItem);
  res.send(result);
});

app.delete('/carts/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await cartCollection.deleteOne(query);
  res.send(result);
})


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Rhythm in the mansion')
})

app.listen(port, () => {
    console.log(`Rhythmic Mansion Server is running on port ${port}`)
})