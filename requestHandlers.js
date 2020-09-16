/*
	Flow for creating user and authentication

	step 1: create user
	POST /createUser
	BODY: 
	{
    "user_name": "bob snorfuss",		// put whatever you want
    "password": "blah"					// client coined password - use a GUID
	}

	RETURN:
	{
    "user_name": "bob snorfuss",
    "password": "blah",
    "user_id": "db8b808d-213e-4ea0-8ded-20f65f86ba61",		// get and store the user_id
    "id": "f1e808e3-f641-4199-9a71-a694f41a63d4",
    "_rid": "a0FnAM4-tQ8EAAAAAAAAAA==",
    "_self": "dbs/a0FnAA==/colls/a0FnAM4-tQ8=/docs/a0FnAM4-tQ8EAAAAAAAAAA==/",
    "_etag": "\"9001334e-0000-0200-0000-5f4c36660000\"",
    "_attachments": "attachments/",
    "_ts": 1598830182
	}

	step 2: login to get auth token
	POST /login
	BODY:
	{
    "user_id": "946ff81f-8b94-49c7-9362-6d620000fe52",		// user_id from /createUser
    "password": "blah"
	}

	RETURN:
	{
    "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJib2Igc25vcmZ1c3MiLCJwYXNzd29yZCI6ImJsYWgiLCJ1c2VyX2lkIjoiOTQ2ZmY4MWYtOGI5NC00OWM3LTkzNjItNmQ2MjAwMDBmZTUyIiwiaWQiOiIxYjU2MTkzOS00ZDQ5LTQwZGYtYTU5NS1jYjUzOTM0YzU1M2EiLCJfcmlkIjoiYTBGbkFNNC10UThCQUFBQUFBQUFBQT09IiwiX3NlbGYiOiJkYnMvYTBGbkFBPT0vY29sbHMvYTBGbkFNNC10UTg9L2RvY3MvYTBGbkFNNC10UThCQUFBQUFBQUFBQT09LyIsIl9ldGFnIjoiXCI4ZTAxNzY5ZS0wMDAwLTAyMDAtMDAwMC01ZjRiZmU3MzAwMDBcIiIsIl9hdHRhY2htZW50cyI6ImF0dGFjaG1lbnRzLyIsIl90cyI6MTU5ODgxNTg1OSwiaWF0IjoxNTk4ODI5NjUzLCJleHAiOjE1OTg4MzMyNTN9.OROMe2tRtrCZxpSmkfHRXaoHDmr67q7SAxjf7L_SO90"
	}

	For every call that needs an authenticated user include the Authorization header with the value of auth_token above

	The auth_token will expire after 1 hour by default.  afterward you will receive 401 error codes.  You may shorten 
	the timeout for testing purposes by setting the environment variable DEFAULTTTL to the number of seconds you want
	the timeout to be.  you will need to delete the mask_users_tokens container before changing this value.
*/
const userModel = require('./userModel');

const debug = require('debug')('requestHandlers')

function newId(){
	var letters = "0123456789ABCD"
	var color = ""
	for (var i = 0; i < 6; i++)
       color += letters[(Math.floor(Math.random() * 14))];
    return color;
}

async function getMaskReports(req, res) {
	/* query params
		latitude, longitude, size (meters)
	*/
	debug('GET /maskReport')
	const mm = req.app.get('maskModel')
	debug(req.query)
	result = await mm.find(req.query)
	res.send(result)
}

async function createUser(req, res) {
	/* schema
	{
		user_name: <string>
		password: <string> // password coined by client
	}
	*/
	debug('POST /createUser')
	const um = req.app.get('userModel')
	const result = await um.addItem(req.body)
	res.send(result)
}

async function login(req, res) {
	/*
		post body
		{
			user_id: <userid> //returned from createUser
			password: <pwd> // coined by client
		}

		response json
		{
			auth_token: <token>  // will expire at some point
		}
	*/
	debug('POST /login')
	const um = req.app.get('userModel')
	const result = await um.login(req.body)
	if (!result.auth_token ) {
		res.sendStatus(401)
	}
	else {
		res.send(result)
	}
}

async function isAuthenticated(req, res, next) {
	// do we have an auth header?
	if (!req.headers.authorization) {
		debug('no Authorization header sent')
		res.status(403).send();
		return;
	}

	const um = req.app.get('userModel')
	const authenticated = await um.isAuthenticated(req.headers.authorization)
	if (authenticated) {
		return next();
	}
  
	// not authenticated
	debug('not authenticated')
	res.status(401).send();
}

function setupHandlers(app){

	app.get('/', (req, res) => {
		console.log(req.session.username)
		
		if(req.session.username){
			res.redirect('/messager')
		}
		else{
			res.sendFile(__dirname + '/public/index.html')

		}
	})

	app.get('/logout', (req, res) => {
		req.session.destroy();
		// res.redirect('/')
		res.send({});
	})

	app.get('/requestAuthKey',(req,res)=>{
		debug('GET /reqeustAuthKey')
		req.session.authKey = newId();
		res.send({"authKey":req.session.authKey});
	})
	
	app.get('/verifyAuthKey',(req,res)=>{
		let clientKey = req.session.authKey;
		
		if(clientKey !== undefined){
			res.send({"authorized":true})
		}
		else{
			res.send({"authorized":false})
		}
	})

	// create a user
	app.post('/createUser', createUser)

	// login
	app.post('/login', login)

	// mask reporting
	app.post('/maskReport', isAuthenticated, (req, res) => {
		/* schema
		{ 
			user_id: <userid>,
			location: {
				latitude: <lat>,
				longitude: <lng>,
				precision: <prec>
			},
			maskval: <maskiness: 1-5>
		}
		*/
		debug('POST /maskReport')
		const mm = req.app.get('maskModel')
		user = mm.addItem(req.body)
		res.send(user)
	})

	// SELECT * FROM mask_reports mr where 
    // mr.location.latitude < -131 and mr.location.latitude > -132 and
	// mr.location.longitude < 38 and mr.location.longitude > 37
	app.get('/maskReport',isAuthenticated, getMaskReports)

	// app.get('/login', (req, res) => {

	// 	username = req.query.username;
	// 	password = req.query.password;
	// 	if(username === undefined || password === undefined || username === null || password === null || username.length === 0 || password.length === 0){
	// 		res.send({"error":"bad or missing username or password"})
	// 	}
	// 	else{
	// 		for(let u = 0; u< users.length; u++){
	// 			if(users[u].username == username){
	// 				// console.log("attempt login")
	// 				// console.log(password)
	// 				// console.log(users[u].password)
	// 				// console.log(passwordHash.generate(password))
	// 				// console.log(passwordHash.verify(password, users[u].password))
	// 				// console.log("attempt login /")

	// 				if(passwordHash.verify(password, users[u].password)){
	// 					req.session.username = username
	// 					req.session.userid = users[u].userid
	// 					res.send({"success":"logged in"})
	// 					return;
	// 				}
	// 				else{
	// 					res.send({"error":"invalid username or password"})
	// 				}


	// 				break;
	// 			}
	// 		}



	// 		res.send({"error":"invalid username or password"})
	// 	}


	// })
	

	// app.get('/signup', (req, res) => {
	// 	username = req.query.username;
	// 	password = req.query.password;
	// 	//var hashedPassword = passwordHash.generate('password123');
	// 	if(username === undefined || password === undefined || username === null || password === null || username.length === 0 || password.length === 0){
	// 		res.send({"error":"bad or missing username or password"})
	// 	}
	// 	else{
	// 		for(let u = 0; u< users.length; u++){
	// 			if(users[u].username == username){
	// 				res.send({"error":"that username already exists"})
	// 				return;
	// 			}
	// 		}

	// 		let newUser = {"userid":newId(), "username":username,"password":passwordHash.generate(password)}
	// 		users.push(newUser);
	// 		req.session.username = username
	// 		req.session.userid = newUser.userid
	// 		console.log("created new user")
	// 		console.log(passwordHash.verify(password,newUser.password));
	// 		//console.log(passwordHash.verify('password123', hashedPassword));

	// 		res.send({"success":"signup up and logged in"})
	// 	}


	// })


	// app.post('/sendMessage', (req, res) => {

	// 	if(req.session.username == undefined){
	// 		res.send({"error":"You must be logged in to send a message"})
	// 	}
	// 	else{
	// 		if(req.body.message){
	// 			addMessage({"message":req.body.message,"userid":req.session.userid})
	// 			res.send({"success":"message body received"})
	// 		}
	// 		else{
	// 			res.send({"error":"message body not received"})
	// 		}
	// 	}


	// })

	





}
exports.setupHandlers = setupHandlers;