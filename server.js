// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
const request = require('request');
const cheerio = require('cheerio')
// var scrape = require('./scrape/scrape.js')
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

// Setting up server
// _________________________________________________________________________________

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/cheerioScrape");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

app.get("/scrape", function(req, res) {
  request('https://www.nytimes.com/', function (error, response, html) {
    if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);
        var articleList = [];
        $('article.theme-summary').each(function(i, element){
            var a = $(this).children('h2').children('a');
            var headline = a.text();
            var url = a.attr('href');
            var summary = $(this).children("p.summary").text();

            var metadata = {
                headline: headline,
                url: url,
                summary: summary,
            };

            if (metadata.url !== undefined) {
                // articleList.push(metadata);
                var entry = new Article(metadata)
                entry.save(function(err, doc) {
                  // Log any errors
                  if (err) {
                    console.log(err);
                  }
                  // Or log the doc
                  else {
                    console.log(doc);
                  }
                });
            }
        })
    }
  });
  res.send("Scrape Complete");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      // console.log(doc)
      res.json(doc);
    }
  });
});

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});





// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
