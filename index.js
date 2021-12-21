const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const port = process.env.PORT || 5000;
// note: (from 'doctors-portal.json' file we copy only private key after convert file content into stringfy )
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
//admin initilize middleware
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
//middleware
app.use(cors());
app.use(express.json());
//connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.trtrt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// sendgrid email sent
const sgMail = require("@sendgrid/mail");
async function sentEmailNotification(email, n) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: [`${email}`, "mahmudul15-8624@diu.edu.bd"], // Change to your recipient
    from: "mahmudul15-8624@diu.edu.bd", // Change to your verified sender
    subject: "About Appointment Status",
    text: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minus corrupti numquam quae fugit quibusdam quis dolores laboriosam atque, aliquam, repellendus totam sunt eius porro iure modi optio excepturi beatae delectus.",
    html: "<strong>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minus corrupti numquam quae fugit quibusdam quis dolores laboriosam atque, aliquam, repellendus totam sunt eius porro iure modi optio excepturi beatae delectus.</strong>",
  };
  await sgMail
    .send(msg)
    .then((response) => {
      console.log(response[0].statusCode);
      console.log(response[0].headers);
      console.log(n);
    })
    .catch((error) => {
      console.error(error);
    });
}

//verify token middleware
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req?.headers?.authorization?.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");
    app.get("/appointments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;
      //console.log(email, date);
      const query = { email: email, date: date };
      console.log("i miss u jan", query);
      const cursor = appointmentsCollection.find(query);
      //console.log("i miss u jan", cursor);
      const appointments = await cursor.toArray();
      //console.log("i miss u jan", appointments);

      res.json(appointments);
    });

    app.post("/appointments", async (req, res) => {
      const n = "email success notification ";
      await sentEmailNotification(req?.body?.email, n);
      const appointment = req.body;
      //console.log("appointment", appointment);
      const result = await appointmentsCollection.insertOne(appointment);
      res.json(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      console.log("put", user);
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctors portal!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});

// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id');
// app.delete('/users/:id')
// users: get
// users: post
