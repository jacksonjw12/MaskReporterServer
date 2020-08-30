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
	result = await mm.find(parseFloat(req.query.latitude), parseFloat(req.query.longitude), parseFloat(req.query.size))
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