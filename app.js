//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require('mongoose-findorcreate')

//set up session
const session = require("express-session");

//set up passport
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//Simplifies building username and password login with Passport.
const passportLocalMongoose = require("passport-local-mongoose");



const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: true}));

//Set up session
//Be sure to use session() before passport.session() to ensure that the login session is restored in the correct order.
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));


//In a Express-based application, passport.initialize() middleware is required to initialize Passport.
app.use(passport.initialize());
//If your application uses persistent login sessions, passport.session() middleware must also be used.
app.use(passport.session());

//connect to mongoose
mongoose.connect("mongodb://localhost:27017/user");

//create mongoose schema
const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  facebookId:String,
  secret:String
});

//add the mongoSchema plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//create the mongo model
const User = new mongoose.model("User", userSchema);

//Allow local authentication accepts username and password arguments, which are submitted to the application via a login form.
passport.use(User.createStrategy());


// In order to support login sessions, Passport will serialize and deserialize user instances to and from the session.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//passport Google auth configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req,res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] }));

app.get("/auth/google/Secrets",
    passport.authenticate("google", { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect("/secrets");
});

app.get("/login", function(req,res){
  res.render("login");
});

app.get("/register", function(req,res){
  res.render("register");
});


// create the secret page becuase now authentifcaction is done by cookies
app.get("/secrets", function(req, res){
  User.find({"secret":{$ne:null}}, function(err, founderUser){
    if(err){
      console.log(err);
    }else{
      if(founderUser){
      res.render("secrets",{usersWithSecrets:founderUser});
      }
    }
  });
});

app.get("/submit",function(req,res){
  if (req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;
const submittedID = req.body.id;
  //find the user -  req.user -and save the secrets
User.findById(req.user.id, function(err, foundUser){


  if (err){
    console.log(err);
  }else{
    if(foundUser){
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  }
});
});

app.post("/register", function(req, res){
  //use passport-local-mongoose to set up the route
  User.register({username:req.body.username}, req.body.password, function(err, user) {
  if (err) {
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});


app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/login", function(req, res){

  const user = new User({
    username:req.body.username,
    password:req.body.password
  });

  // use passport to login and authenticate the user
  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
  });

});

app.listen(3000, function(){
  console.log("server is successfully running on port 3000");
});
