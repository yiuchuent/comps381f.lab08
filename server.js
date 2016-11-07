var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var bodyParser = require('body-parser');
//comment line

// Use your own mlab account!!!
var mongourl = 'mongodb://user:user@ds147167.mlab.com:47167/photos';
//var mongourl = 'mongodb://student:password@ds031873.mlab.com:31873/comps381f';
//var mongourl = 'mongodb://localhost:27017/photos';

var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();

// middlewares
app.use(fileUpload());   // add 'files' object to req
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({entended: true}));


app.post('/upload', function(req, res) {
    var sampleFile;

    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
    console.log("upload params: " + JSON.stringify(req.body));
    MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to mlab.com');
      assert.equal(null,err);
      create(db, req.files.sampleFile, req.body, function(result) {
        
        db.close();
        if (result.insertedId != null) {
          res.status(200);
          res.end('Inserted: ' + result.insertedId)
        } else {
          res.status(500);
          res.end(JSON.stringify(result));
        }
      });
    });
    /*
    sampleFile = req.files.sampleFile;
    sampleFile.mv(__dirname + '/somewhere/on/your/server/filename.jpg', function(err) {
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
	  if (key != null) {
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
    } else {
      res.status(500);
      res.end('Error: query parameter "key" is missing!');
    }
  });
});

app.get('/display', function(req,res) {
  MongoClient.connect(mongourl,function(err,db) {
    console.log('Connected to mlab.com');
    console.log('Finding key = ' + req.query.key)
    assert.equal(null,err);
    var bfile;
    var key = req.query.key;
	  if (key != null) {
      readFile(db, key, function(doc) {
        if (doc != null) {
          console.log('Found: ' + key)
          res.set('Content-Type','text/html');
     	  res.write('<center>');
     	  res.write('<img src="/download?key=' + key +'"/><br>');
     	  res.write(doc.caption + '<br>');
     	  res.write("Date: " + doc.month + "/" + doc.year);
     	  res.write('</center>');
          res.end();
        } else {
          res.status(404);
          res.end(key + ' not found!');
          console.log(key + ' not found!');
        }
        db.close();
      });
    } else {
      res.status(500);
      res.end('Error: query parameter "key" is missing!');
    }
  });
});

app.get('/read', function(req, res) {
  MongoClient.connect(mongourl,function(err,db) {
    console.log('/read request');
    console.log('Finding key = ' + JSON.stringify(req.query))
    assert.equal(null,err);
    var bfile;
    var year = req.query.year;
    var month = req.query.month;
    //var key = req.query.key;
      readByDate(db, req.query, function(photosList) {
        //console.log('req.query: ' + JSON.stringify(req.query));
        if (photosList != null) {
          console.log('Found: ' + photosList.length)
          res.set('Content-Type','text/html');

	  for (photo in photosList) {
		var p = photosList[photo];
	 	res.write('<a href="/display?key=' + p._id +'">' + p.caption +'</a>' +'<br>');
	  }

	  res.end('<br>');
        } else {
          res.status(404);
          res.end( ' not found!');
          console.log(' not found!');
        }
        db.close();
      });
  });
});

function create(db,bfile,query,callback) {
  console.log(bfile);
  db.collection('photos').insertOne({
    "data" : new Buffer(bfile.data).toString('base64'),
    "mimetype" : bfile.mimetype,
    "caption" : query.caption,
    "month" : query.month,
    "year" : query.year 
  }, function(err,result) {
    //assert.equal(err,null);
    if (err) {
      console.log('insertOne Error: ' + JSON.stringify(err));
      result = err;
    } else {
      console.log("Inserted _id = " + result.insertId);
    }
    callback(result);
  });
}

function read(db,target,callback) {
  var bfile = null;
  var mimetype = null;
  db.collection('photos').findOne({"_id": ObjectId(target)}, function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      bfile = new Buffer(doc.data,'base64');
      mimetype = doc.mimetype;
    }
    callback(bfile,mimetype);
  });
}

function readFile(db,target,callback) {
  var bfile = null;
  var mimetype = null;
  db.collection('photos').findOne({"_id": ObjectId(target)}, function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      bfile = new Buffer(doc.data,'base64');
      mimetype = doc.mimetype;
    }
    callback(doc);
  });
}

function readByDate(db,target,callback) {
  var photosList = [];
  var caption = null;
  var key = null;
  var cursor =  db.collection('photos').find(target, {data: 0});
  cursor.each(function (err, doc) {
    assert.equal(err,null);
    if (doc != null) {
      console.log('caption: ' + doc.caption);
      console.log('doc: ' + JSON.stringify(doc));
      //caption = doc.mimetype;
      //key = doc._id;
      photosList.push(doc);
    } else {
      callback(photosList);
    }
  });


}

app.listen(8099, function() {
  console.log('Server is waiting for incoming requests...');
});
