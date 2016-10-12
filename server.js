var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://rso:password@ds031873.mlab.com:31873/comps381f';

var http = require('http');
var url  = require('url');
var fs   = require('fs');

var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();

// default options
app.use(fileUpload());

app.post('/upload', function(req, res) {
    var sampleFile;

    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

    MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      create(db, req.files.sampleFile, function(key) {
        res.status(200);
        res.end('Inserted: ' + key)
        db.close();
      });
    });
    /*
    sampleFile = req.files.sampleFile;
    sampleFile.mv('/somewhere/on/your/server/filename.jpg', function(err) {
        if (err) {
            res.status(500).send(err);
        }
        else {
            res.send('File uploaded!');
        }
    });
    */
});

app.get('/download', function(req,res) {
  MongoClient.connect(mongourl,function(err,db) {
    console.log('Connected to mlab.com');
    console.log('Finding key = ' + req.query.key)
    assert.equal(null,err);
    var bfile;
    var key = req.query.key;
    read(db, key, function(bfile,mimetype) {
      if (bfile != null) {
        console.log('Found: ' + key)
        res.set('Content-Type',mimetype);
        res.end(bfile);
      } else {
        res.status(404);
        res.end(key + ' not found!');
        console.log(key + ' not found!');
      }
      db.close();
    });
  });
});

function create(db,bfile,callback) {
  console.log(bfile);
  var key = Math.floor(Date.now() / 1000).toString();
  db.collection('photos').insertOne({
    "data" : new Buffer(bfile.data).toString('base64'),
    "mimetype" : bfile.mimetype,
    "key" : key
  }, function(err,result) {
    assert.equal(err,null);
    console.log("Inserted key = " + key);
    callback(key);
  });
}

function read(db,target,callback) {
  var bfile = null;
  var mimetype = null;
  db.collection('photos').findOne({"key": target}, function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      bfile = new Buffer(doc.data,'base64');
      mimetype = doc.mimetype;
    }
    callback(bfile,mimetype);
  });
}

app.listen(8000, function() {});
