require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");
//const encrypt = require("mongoose-encryption"); //level 2 - encryption
//const sha512 = require('js-sha512'); //level 3 - hashing
//const bcrypt = require("bcrypt"); //level 4 - salting and bcrypt
//const saltRounds = 10;
const session = require("express-session")
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//setting up express and middleware
const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.set("view engine", "ejs");

//place session code after app.use and before connecting to MongoDB server
app.use(session({ //express-session  -  checks every request for a Session Cookie header and if none, sets a Cookie w session info
  secret: process.env.SECRET, //creates req.session if cookie is set
  resave: false,
  saveUninitialized: true
}));

//checks after every request for passport.user property in req.session, if password.autheticate has not been called, passport.user will not exist yet
app.use(passport.initialize());
app.use(passport.session()); //The passport.session() middleware uses the user property found on req.session.passport.user to re-initialize the req.user object to equal the user attached to the session via the passport.deserializeUser() function.

//connecting to MongoDB server
mongoose.connect("mongodb://localhost:27017/userDB",{
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
},(err) => err ? console.log(err) : console.log("Connected to mongod server"));

//defining Mongo schemas
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  password: {
    type: String
  }
});

////setting up mongoose encryption
//userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ["password"]});

//plugin to passportLocalMongoose
userSchema.plugin(passportLocalMongoose);

//defining Mongo Models
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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
  .post(passport.authenticate("local",  { failureRedirect: '/login'}), (req,res)=>{
    res.redirect("/secrets");
  });

//handling registering users
app.route("/register")
  .get((req,res)=>{
    res.render("register",{});
  })
  .post((req,res)=>{
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
      if(err){
        console.log(err);
        res.redirect("/register");
      }
      else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        });
      }
    });
  });

//now can have secrets because it won't allow access if client is not authenticated
app.route("/secrets")
  .get((req,res)=>{
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stal   e=0, post-check=0, pre-check=0');

    if(req.isAuthenticated()){
      res.render("secrets",{});
    }
    else{
      res.redirect("/login")
    }
  });

app.route("/submit")
  .get((req,res)=>{
    res.render("submit",{});
  });

app.route("/logout")
  .get((req,res)=>{
    req.logout();
    res.redirect("/");
  });


//setting up server spin up
app.listen(3000, ()=>console.log("Server started on port 3000"));
