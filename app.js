//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

// require express-session, passport, passport-local-mongoose; no need to set up passport-local
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: true}));

// set up session
app.use(session({
  secret: "LONGSTRING",
  resave: false,
  saveUninitialized: false
}));


//initialize passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/user");

const userSchema = new mongoose.Schema({
  email:String,
  password:String
});

//add the mongoSchema plugin
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req,res){
  res.render("home");
});

app.get("/login", function(req,res){
  res.render("login");
});

app.get("/register", function(req,res){
  res.render("register");
});

// create the secret page becuase now authentifcaction is done by cookies
app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  }else{
    res.redirect("/login");
  }
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
