
const express = require("express");
const hbs = require("hbs");
const path = require("path");
const app = express();
const fs = require("fs");
const multer=require("multer");
const staticPath = path.join(__dirname, "../public");
const templetsPath = path.join(__dirname, "../templets/partials");
const viewsPath = path.join(__dirname, "../templets/views");
const port = process.env.PORT ||5000;
// const { json } = express.json();

require("./db/voterconn");
const Voter= require("./models/voter");
const Candidate = require("./models/candidate");
require("./db/candidateconn");
const bcrypt = require('bcrypt');
const { MongoClient, GridFSBucket } = require('mongodb');
const mongoose = require('mongoose')
var conn = mongoose.connection;
var gfsbucket;
var gfsbucketsave;

conn.once("open", () => {
  gfsbucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "post",
  });
});
conn.once("open", () => {
  gfsbucketsave = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "save",
  });
});


const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploade/image");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});
const Save = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploade/cimage");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});
const upload1 = multer({ storage: storage1 });

const upload2= multer({storage: Save});

const session = require('express-session');

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));



app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(express.static(staticPath));
app.set("view engine", "hbs");
app.set("views", viewsPath);
hbs.registerPartials(templetsPath);


app.use('/public', express.static(staticPath));
//home page 
app.get("/", (req, res) => {
  res.render("index");
});

//voter login
app.get("/voter_login",(req,res)=>{
  res.render("voter_login");
});

app.get("/work",(req,res)=>{
  res.render("work");
});
//contact with us
// app.get("/contact",(req,res)=>{
//   res.render("contact");
// });
app.get("/voter_dashboard",(req,res)=>{
  res.render("voter_dashboard");
});

app.get("/contact",(req,res)=>{
  res.render("contact");
});
//admin login
app.get("/admin_login",(req,res)=>{
  res.render("admin_login");
});

// voter registration
app.get("/voter_registration",(req,res)=>{
  res.render("voter_registration");
});

//candidate registration 
app.get("/candidate_registration",(req,res,next)=>{
  res.render("candidate_registration");
});


// registration post
app.post("/voter_registration", upload1.single("vphoto"), async (req, res) => {
  try {
    const password = req.body.vpassword;
    const conpassword = req.body.vconpassword;

    if (password === conpassword) {
      const newVoter = new Voter({
        vname: req.body.vname,
        vage: req.body.vage,
        vid: req.body.vid,
        vadhar: req.body.vadhar,
        vphone: req.body.vphone,
        vpassword: req.body.vpassword,
        vconpassword: req.body.vconpassword,
        vphoto:req.file.filename
        
      });

      
      const voter = await newVoter.save();
      res.status(201).render("index");
      // const candi = await candidate.finone({vid:id})
      res.status(201).render("voter_dashboard",{voter});
    } else {
      res.status(400).send( "message Passwords do not match" );
    }
  } catch (error) {
    res.status(500).send(error);
}
});

// voter login post
// voter login post
app.post("/voter_login", async (req, res) => {
  try {
    const id = req.body.vid;
    const password = req.body.vpass;
    const voter = await Voter.findOne({ voterid: id });
    if (voter && voter.password === password) {
      // Store voter ID in session upon successful login
      req.session.voterId = voter._id;

      const candidates = await Candidate.find(); // Fetch all candidates
      res.status(201).render("voter_dashboard", { voter, candidates, hasVoted: voter.hasVoted });
    } else {
      res.send("Invalid voter ID or password");
    }
  } catch (error) {
    res.status(400).send("Invalid voter ID or password");
  }
});



// admin login post
app.post("/admin_login", (req, res) => {
  const id = "sahu";
  const password = "4321";
  const allVoters = await Voter.find();
  console.log(allVoters);
  if (req.body.admin_id ===id && req.body.admin_password === password) {
    res.render("candidate_registration");
  } else {
    res.status(400).send("Invalid admin ID or password");
  }
});




// candidate post
app.post("/candidate_registration", upload2.single("cphoto"), async (req, res) => {
  try {
    const newCandidate = new Candidate({
      cname: req.body.cname,
      cage: req.body.cage,
      cvoterid: req.body.cvoterId,
      cadhar: req.body.cadhar,
      cparty: req.body.cparty,
      cphoto: req.file.filename,
      cphone: req.body.cphone
    });
    
    const candidate = await newCandidate.save();
    res.status(201).render("candidate_registration");
    // Render "voter_dashboard" with the saved candidate
    res.status(201).render("voter_dashboard", { candidate });
  } catch (error) {
    res.status(400).send(error);
  }
});







//for votes

app.post("/vote", async (req, res) => {
  try {
    const candidateId = req.body.candidateId;
    const voterId = req.session.voterId; 

    const candidate = await Candidate.findById(candidateId);
    if (candidate) {
      candidate.votes += 1;
      await candidate.save();

      // Update the voter's status to has voted
      const voter = await Voter.findById(voterId);
      voter.hasVoted = true;
      await voter.save();

      res.status(200).send({ message: "Vote counted successfully" });
    } else {
      res.status(404).send({ message: "Candidate not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error counting vote", error });
  }
});





app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
