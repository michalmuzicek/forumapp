//loading used modules
var http = require('http');
var express = require('express');


var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var bodyParser = require('body-parser');
//var url = 'mongodb://localhost:27017/forum';
var url = 'mongodb://michal.muzicek:1timePassword@ds047865.mongolab.com:47865/forum-michal-muzicek';
var Sthreads = '';
var Sposts = '';
var Susers = '';
var last_thread_id; // for keeping record of last thread id
var last_post_id;  // for keeping record of last post id


var refresh = function()
{
  // Connect to the db
  MongoClient.connect(url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      //HURRAY!! We are connected. :)
      console.log('Connection established to', url);
  
      // Get the documents collection     
      db.collection('threads').find().sort({"id":-1}).limit(1).toArray(function(err,result){last_thread_id = result[0].id}); //update data variable      
      
      db.collection('threads').find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
          //console.log('Found:', result);
          Sthreads = result;
          
        } else {
          console.log('No document(s) found with defined "find" criteria!');
        }
        });
        
        //users
        
        db.collection('users').find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
          //console.log('Found:', result);
          Susers = result;
        } else {
          console.log('No document(s) found with defined "find" criteria!');
        }
        });
        
        //posts
		
        db.collection('posts').find().sort({"id":-1}).limit(1).toArray(function(err,result){last_post_id = result[0].id_post}); //update data variable
        
        db.collection('posts').find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
          //console.log('Found:', result);
          Sposts = result;
        } else {
          console.log('No document(s) found with defined "find" criteria!');
        }
          //db.close(); //close connection on the LAST request
          });                      
    }
    
  });
      
  };

 refresh(); //prvnotni naplneni datovych promennych
 
//Lets define a port we want to listen to

const PORT=8080; 
var app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get('/*', function(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

app.post('/*',function(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

app.set('json spaces', 4); // make it pretty

app.get('/', function (req, res) {
  res.send('Hello');
});

app.get('/users', function (req, res) {
  var result = {"users" : Susers}
  res.json(result);
});

app.get('/threads', function (req, res) {
  var result = {"threads" : Sthreads};
  res.json(result);
});

app.get('/posts', function (req, res) {
  var result = {"posts" : Sposts}
  res.json(result);
});

app.get('/posts/:tagId', function (req, res) 
{
	var pID = req.params.tagId;
    MongoClient.connect(url, function (err, db) 
    {
		  if (err) {
		    console.log('Unable to connect to the mongoDB server. Error:', err);
		  } else 
			  {
			    //HURRAY!! We are connected. :)
			    console.log('Connection established to', url);
			
			    // Get the documents collection
			    var mycollection = db.collection('posts');
				
			    mycollection.find({'id': parseInt(pID)}).toArray(function (err, result) 
				    {
				      if (err) {
				        console.log(err);
				      } else if (result.length) {
				        //console.log('Found:', result);
						    
				      } else {
				        console.log('No document(s) found with defined "find" criteria!');
				      }
				      //db.close(); //close connection on the LAST request

				      var result = {"posts" : result}
				      res.send(result);
				    });
		     }
      });      

});




var server = app.listen(process.env.PORT || PORT, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Forum app listening at http://%s:%s', host, port);
});


function parseUsername(req,res,next)
{
  res.locals.postUser = req.body.user;
  next();
}

function authorize(req,res,next)
{
  var found = false;
  var fuser;
  Susers.forEach(function(user){
       if (user.username == res.locals.postUser)
       {
         res.locals.user = user;
         found = true;
         return next();
       }
     });
  
  if(!found)
  {
    console.log('Unauthorized acceess : ');
    console.log(res.locals.postUser);
    return res.sendStatus(401);
  }
     
};


// POST method route
app.post('/posts',parseUsername,authorize, function (req, res) 
{
	var Pusername = req.body.user;
  var text = req.body.text;	
  var thread_id = parseInt(req.body.id);
  var id = last_post_id+1; 
  var date = new Date();
  date = date.getTime();
  var author;
  
  MongoClient.connect(url, function(err, db) 
  {
    assert.equal(null, err);        
    Susers.forEach(function(entry)
    {
      if (entry.username == Pusername)
      {
        author = entry;
      }
    });
    
    db.collection('posts').insert(
        {
                    "id": thread_id,
                    "id_post": id,
                    "created_at": date,
                    "text" : text,
                    "author": author
        }, function(err3, result2) {
        assert.equal(err3, null);
        console.log("Inserted post into the posts collection.");
        //db.close();
        refresh(); //keep the data variables up to date
        }         
      );
      
  });
    
    
  res.send({ status: 'SUCCESS' });
  
});

app.post('/threads',parseUsername,authorize, function (req, res) {
  var title = req.body.text;	
  var author = req.body.user;
  
  MongoClient.connect(url, function(err, db) 
  {
    assert.equal(null, err);    
    var id = last_thread_id+1;
    var Turl = "/threads/"+(last_thread_id+1);
    var date = new Date();
    date = date.getTime();
    var success = false;       
    db.collection('threads').insert(
        {
    				    "id" : id,
    				    "url": Turl,
    				    "title": title,
    				    "created_at": date,
                "author": author
    				
        }, function(err2, result) {
        assert.equal(err2, null);   
        console.log("Inserted thread into the threads collection.");
        success = true;
        //db.close();
        refresh(); //keep the data variables up to date
        
        if(success)
          {
            res.sendStatus(200);
          }    
          else
          {
            res.sendStatus(500);
          }
        }
         
      );
    
  });
  
  
}); 

