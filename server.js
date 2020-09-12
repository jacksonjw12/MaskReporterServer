const maskModel = require('./maskModel')
const userModel = require('./userModel')
const CosmosClient = require('@azure/cosmos').CosmosClient
const express = require('express');
const app = express();
const debug = require('debug')('server')



let session = require('express-session');
let {MemoryStore} = require('express-session');
// var passwordHash = require('password-hash');

//replace in-memory store with database store
let store = new MemoryStore();

var requestHandlers = require("./requestHandlers");


function start(){
	// environment variables needed
	// export PORT=8081
  	// export DBHOST=https://mask-reporter-db.documents.azure.com:443/
  	// export DBAUTHKEY={get from azure}
	// export DEBUG=* // to turn on all debug output
	// export DATABASEID=db //set to another string value to use a custom database namespace
	// export GLOBALSECRET=secret // uuid that is the global secret used for creating jwt token

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

	// global secret
	if ( !process.env.GLOBALSECRET ) {
		debug("No global secret")
		process.exit(1)
	}

	// setup database
	dbhost = process.env.DBHOST;
	dbauthKey = process.env.DBAUTHKEY;
	databaseId = "mask-reporter-db";
	if ( process.env.DATABASEID ) {
		databaseId = process.env.DATABASEID
		debug("datbase " + databaseId)
	}
	defaultTTL = 3600  // 1 hour
	if (process.env.DEFAULTTTL ) {
		defaultTTL = Number(process.env.DEFAULTTTL)
		debug("defaultTTL " + defaultTTL)
	}

	containerId = "mask_reports";
	userContainerId = "mask_users"
	const cosmosClient = new CosmosClient({
		endpoint: dbhost,
		key: dbauthKey
	  })

	const mm = new maskModel(cosmosClient, databaseId, containerId)
	mm.init(err => {
		  console.error(err)
		})
		.catch(err => {
		  console.error(err)
		  console.error(
			'Shutting down because there was an error settinig up the database.'
		  )
		  process.exit(1)
		})
	const um = new userModel(cosmosClient, databaseId, userContainerId, process.env.GLOBALSECRET, defaultTTL)
	um.init(err => {
			console.error(err)
		})
		.catch(err => {
			console.error(err)
			console.error(
			'Shutting down because there was an error settinig up the database.'
			)
			process.exit(1)
		})
	app.set('userModel', um)
	app.set('maskModel', mm)

	//register request handler functions
	requestHandlers.setupHandlers(app);

	const port = process.env.PORT ? process.env.PORT : 8080
	app.listen(port, () => console.log(`Listening on port ${port}!`));
}


exports.start = start;

