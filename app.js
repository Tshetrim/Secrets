const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");
const encrypt = require("mongoose-encryption");

//setting up express and middleware
const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.set("view engine", "ejs");

//connecting to MongoDB server
mongoose.connect("mongodb://localhost:27017/userDB",{
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
},(err)=> err ? console.log(err) : console.log("Connected to mongod server"));

//defining Mongo schemas
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String
  }
});

//setting up mongoose encryption
const secret = "Uau2eNSvRdHKDPNFJrPcuA";
userSchema.plugin(encrypt,{secret: secret, encryptedFields: ["password"]});

//defining Mongo Models
const User = mongoose.model("User",userSchema);

//setting up routes
app.route("/")
  .get((req,res)=>{
    res.render("home",{});
  });

//handling loging in
app.route("/login")
  .get((req,res)=>{
    res.render("login",{});
  })
  .post((req,res)=>{
    const email = req.body.username;
    const password = req.body.password;
    User.findOne({email:email},(err, foundMatch)=>{
      if(err)
        console.log(err);
      else {
        if(foundMatch){
          if(foundMatch.password === password){
            res.render("secrets");
          }
          else
            res.render("login");
        }
        else{
          console.log("no match");
          res.render("login");
        }
      }
    });
  });

//handling registering users
app.route("/register")
  .get((req,res)=>{
    res.render("register",{});
  })
  .post((req,res)=>{
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
    });
    newUser.save((err)=>err ? console.log("req.body.username "+ err) : res.render("secrets"));
  });

/*app.route("/secrets")
  .get((req,res)=>{
    res.render("secrets",{});
  });*/

app.route("/submit")
  .get((req,res)=>{
    res.render("submit",{});
  });


//setting up server spin up
app.listen(3000, ()=>console.log("Server started on port 3000"));
