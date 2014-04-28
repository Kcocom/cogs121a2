//dependencies for each module used
var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');
var app = express();

//load environment variables
var dotenv = require('dotenv');
dotenv.load();

//load tumblr
var tumblr = require('tumblr');

//have two blank strings for access token and access secret
var accessToken = "";
var accessSecret = "";
var oauth = {
	consumer_key: process.env.TUMBLR_CONSUMER_KEY,
	consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
	token: accessToken,
	token_secret: accessSecret
};
//set up Oauthrequirements
var passport = require('passport'),
util = require('util'),
passportTumblrStrategy = require('passport-tumblr').Strategy;

//Set up passport session set up.
//This allows persistant login sessions so the user doesn't need to keep logging in everytime
//for their access token
passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/');
}


//Use TumblrStrategy with passport
passport.use(new passportTumblrStrategy({
	consumerKey: process.env.TUMBLR_CONSUMER_KEY,
	consumerSecret: process.env.TUMBLR_CONSUMER_SECRET,
	callbackURL: "http://127.0.0.1:3000/auth/callback"
}, function (token, tokenSecret, profile, done) {
	accessToken = token;
	accessSecret = tokenSecret;
	oauth.token = token;
	oauth.token_secret = tokenSecret;
	process.nextTick(function() {

		return done(null, profile);
	});
}));

//Configures the Template engine
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
//more setting up configuration for express
//Allows cookie access and interaction
app.use(express.cookieParser() );
app.use(express.session({ secret: 'nyan cat'}));
//Intialize passport
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);


//routes
app.get('/', function(req, res) {
	res.render('index');
});
app.get('/auth', passport.authenticate('tumblr'), function(req, res) {
	//Nothing should be here since request redirects to '/' after callback is done
});
//we need to set up a callback route too
app.get('/auth/callback', 
	passport.authenticate('tumblr', { failureRedirect: '/' }),
	function(req, res) {
		res.redirect('/home');
	});

app.get('/home', ensureAuthenticated, function(req, res) {
	res.render('home');
});

//this route will display all the data
app.get('/home/default', ensureAuthenticated, function(req, res) {
	//setup a new tumblr user with authentication
	var user = new tumblr.User(oauth);
	user.dashboard(function(err, response) {
		var data = [];
		console.log(response);
		//because this is syncrhonous, we have to do a for loop recursively and render only when it's done
		function saveData(i) {
			if (i < response.posts.length) { 
				var temp = {};
				temp.name = response.posts[i].short_url;
				temp.posts = response.posts[i].note_count;
				data.push(temp);
				saveData(i+1);
			}
		}
		saveData(0);
		res.json(data);
	});
});



//set environment ports and start application
app.set('port', process.env.PORT || 3000);
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});