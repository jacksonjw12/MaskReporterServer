const express = require('express');
const app = express();


let session = require('express-session');
let {MemoryStore} = require('express-session');
// var passwordHash = require('password-hash');

//replace in-memory store with database store
let store = new MemoryStore();

// 

var requestHandlers = require("./requestHandlers");

function start(){


	app.use(session({
	    secret: 'aosdnaoisdiodankasndgjirnms',
	    resave: true,
	    store,
	    saveUninitialized: false,
	    cookie: { secure: false }
	}));

	app.use(express.json());


	




	app.use(express.static(__dirname + '/public'));
	app.use(express.static(__dirname + '/media'));

	//register request handler functions
	requestHandlers.setupHandlers(app);


	//const port = 8080;
	const port = process.env.PORT
	app.listen(port, () => console.log(`Listening on port ${port}!`));



}


exports.start = start;

