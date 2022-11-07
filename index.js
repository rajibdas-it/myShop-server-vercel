const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
require("colors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fe8xrlp.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// function verifyJWT(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     res.status(401).send({ message: "Unauthorized Access" });
//   }
//   const token = authHeader.split(" ")[1];

//   jwt.verify(token, process.env.USER_TOKEN, function (err, decoded) {
//     if (err) {
//       res.status(401).send({ message: "Unauthorized Access" });
//     }
//     req.decoded = decoded;

//     next();
//   });
// }

function verifyJWT(req, res, next) {
  const { authorization } = req.headers;
  const authHeader = authorization;
  if (!authHeader) {
    res.status(401).send({ message: "no token found" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.USER_TOKEN, function (err, decoded) {
    if (err) {
      res.status(401).send({ message: "not valid token" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productCollection = client.db("myShop").collection("product");
    const orderCollection = client.db("myShop").collection("orders");
    const userCollection = client.db("myShop").collection("users");
    // const hashedPassword = await bcrypt.hash("rajib123456", 10);
    // const newUser = {
    //   userName: "Rajib Das",
    //   email: "rajibrad@gmail.com",
    //   password: hashedPassword,
    // };
    // const result = await userCollection.insertOne(newUser);
    // console.log(result);
    // res.send(result);

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.USER_TOKEN, { expiresIn: "1h" });
      res.send({ token });
    });

    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      // console.log(page, size);
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      const count = await productCollection.estimatedDocumentCount();
      res.send({ count, products });
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    app.get("/orders", verifyJWT, async (req, res) => {
      // const query = { email: req.query.email };
      const decoded = req.decoded;
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "Not valid user information" });
      }

      // if (decoded.email !== req.query.email) {
      //   res.status(403).send({ message: "Unauthorized Access" });
      // }
      // console.log("inside order api", decoded);

      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: status,
        },
      };
      const result = await orderCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // app.post("/signup", async (req, res) => {
    //   const hashedPassword = await bcrypt.hash(req.body.password, 10);
    //   const newUser = {
    //     username: req.body.username,
    //     email: req.body.email,
    //     password: hashedPassword,
    //   };
    //   const result = await userCollection.insertOne(newUser);
    //   res.send({
    //     message: "User Created Successfully.",
    //     data: result,
    //   });
    // });

    // app.post("/login", async (req, res) => {
    //   const query = { email: req.body.email };
    //   // console.log(query);
    //   const user = await userCollection.findOne(query);
    //   // console.log(user.email);
    //   if (user) {
    //     isValidPassword = await bcrypt.compare(
    //       req.body.password,
    //       user.password
    //     );
    //     // console.log(isValidPassword);
    //     if (isValidPassword) {
    //       const currentUser = {
    //         email: user.email,
    //       };
    //       // console.log(currentUser);

    //       const token = jwt.sign(currentUser, process.env.USER_TOKEN, {
    //         expiresIn: "1h",
    //       });
    //       res.status(200).send({
    //         token,
    //         message: "Login Successful",
    //       });
    //     } else {
    //       res.status(403).send({ message: "Password not matched" });
    //     }
    //   } else {
    //     res.status(403).send({
    //       message: "User Not Found",
    //     });
    //   }
    // });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`server running on port ${port}`.cyan);
});

module.exports = app;
