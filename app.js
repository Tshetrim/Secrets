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
//level 6 - OAuth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const findOrCreate = require('mongoose-findorcreate')


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
    unique: true,
    sparse: true
  },
  password: {
    type: String
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true
  },
  TwitterId: {
    type: String,
    unique: true,
    sparse: true
  }
});

////setting up mongoose encryption
//userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ["password"]});

//plugin to passportLocalMongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//defining Mongo Models
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

const homeURL = "http://localhost:3000";

//establishing Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: homeURL+"/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//establshing Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: homeURL+"/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//establshing Twitter Strategy
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: homeURL+"/auth/twitter/secrets"
  },
  function(token, tokenSecret, profile, cb) {
    User.findOrCreate({ twitterId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//setting up routes
app.route("/")
  .get((req,res)=>{
    res.render("home",{});
  });

//handling loging in
app.route("/login")
  .get((req,res)=>{
    if(req.isAuthenticated()){
      res.redirect("/secrets");
    }
    else{
      res.render("login",{})
    }
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

//routes to handle OAuth through Google
app.route("/auth/google")
  .get(passport.authenticate("google", { scope: ["email","profile"]}), (req,res)=>{

  });

  app.route("/auth/google/secrets")
    .get(passport.authenticate('google', { failureRedirect: '/login' }), (req, res)=>{
      // Successful authentication, redirect secrets.
      res.redirect('/secrets');
    });

//routes to handle OAuth through Facebook
app.route("/auth/facebook")
  .get(passport.authenticate("facebook"), (req,res)=>{

  });

  app.route("/auth/facebook/secrets")
    .get(passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res)=>{
      // Successful authentication, redirect secrets.
      res.redirect('/secrets');
    });

//routes to handle OAuth through Twitter
app.route("/auth/twitter")
  .get(passport.authenticate("twitter"), (req,res)=>{

  });

  app.route("/auth/twitter/secrets")
    .get(passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res)=>{
      // Successful authentication, redirect secrets.
      res.redirect('/secrets');
    });

//setting up server spin up
app.listen(3000, ()=>console.log("Server started on port 3000"));
