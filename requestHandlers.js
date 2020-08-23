const debug = require('debug')('requestHandlers')

function newId(){
	var letters = "0123456789ABCD"
	var color = ""
	for (var i = 0; i < 6; i++)
       color += letters[(Math.floor(Math.random() * 14))];
    return color;
}

async function getMaskReports(req, res, mm) {
	/* query params
		latitude, longitude, size (meters)
	*/
	debug('GET /maskReport')
	debug(req.query)
	result = await mm.find(parseFloat(req.query.latitude), parseFloat(req.query.longitude), parseFloat(req.query.size))
	res.send(result)
}

function setupHandlers(app, mm){

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

	// mask reporting
	app.post('/maskReport', (req, res) => {
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
		mm.addItem(req.body)
		res.send()
	})

	// SELECT * FROM mask_reports mr where 
    // mr.location.latitude < -131 and mr.location.latitude > -132 and
	// mr.location.longitude < 38 and mr.location.longitude > 37
	app.get('/maskReport', (req, res) => getMaskReports(req, res, mm))

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