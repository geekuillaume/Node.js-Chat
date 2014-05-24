//	Customization

var appPort = 16558;
var numRounds = 10; //number of rounds
var minPlayers = 3; //min number of players
var roundInterval = 60; // interval in seconds for entry events
var voteInterval = 10; //interval in seconds for vote events

// Librairies

var express = require('express'), app = express();
var http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);


var jade = require('jade');
// var io = require('socket.io').listen(app);
var pseudoArray = ['admin']; //block the admin username (you can disable it)

// Views Options

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false })

app.use(express.static(__dirname + '/public'));

// Render and send the main page

app.get('/', function(req, res){
  res.render('home.jade');
});
server.listen(appPort);
// app.listen(appPort);
console.log("Server listening on port 16558");

// Handle the socket.io connections

var users = 0; //count the users

io.sockets.on('connection', function (socket) { // First connection
	var handler = {	 //encapsulates game logic
		started : false,
		submitPhase : false,
		roundsLeft : numRounds,
		currentRound : 0 ,
		players : [],
		start : function(userList){
			started = true;
			this.say("Game has started with "+userList.length+" players");
			currentRound = 1;
			for (var i=0; i < userList.length; i++){
				players[i] = [userList[i], 0]; //builds list and sets scores to 0
			}
		},
		say : function(str){
			var transmit = { date: new Date().toISOString(), pseudo: "Funbot", message: str};
		    socket.emit('message', transmit);       //command shown back to user
			socket.broadcast.emit('message', transmit);
		},
		consumeMessage: function(username, command, argument){
			switch(command){
				case "start":
					this.start();
					break;
				case "say":
					this.say(argument);
					break;
				case "help":
					this.say(username+" needs help!!!");
					break;
			}
		}
	}
	users += 1; // Add 1 to the count
	reloadUsers(); // Send the count to all the users
	socket.on('message', function (data) { // Broadcast the message to all
		if(pseudoSet(socket))
		{
			if (data.charAt(0) == '/') { //if the message is a command...
				var split = data.split(" ");
				var command = split[0].substring(1);
				handler.consumeMessage(returnPseudo(socket),command,"argument"); //send it to the handler
			}
			else{ //message isn't a command so send it normally
				var transmit = {date : new Date().toISOString(), pseudo : returnPseudo(socket), message : data};
				socket.broadcast.emit('message', transmit);
				console.log("user " + transmit['pseudo'] + " said \"" + data + "\"");
			}
		}
		}
	);
	socket.on('setPseudo', function (data) { // Assign a name to the user
		if (pseudoArray.indexOf(data) == -1) // Test if the name is already taken
		{
			socket.set('pseudo', data, function(){
				pseudoArray.push(data);
				socket.emit('pseudoStatus', 'ok');
				console.log("user " + data + " connected");
			});
		}
		else
		{
			socket.emit('pseudoStatus', 'error') // Send the error
		}
	});
	socket.on('disconnect', function () { // Disconnection of the client
		users -= 1;
		reloadUsers();
		if (pseudoSet(socket))
		{
			var pseudo;
			socket.get('pseudo', function(err, name) {
				pseudo = name;
			});
			var index = pseudoArray.indexOf(pseudo);
			pseudo.slice(index - 1, 1);
		}
	});
});

function reloadUsers() { // Send the count of the users to all
	io.sockets.emit('nbUsers', {"nb": users});
}
function pseudoSet(socket) { // Test if the user has a name
	var test;
	socket.get('pseudo', function(err, name) {
		if (name == null ) test = false;
		else test = true;
	});
	return test;
}
function returnPseudo(socket) { // Return the name of the user
	var pseudo;
	socket.get('pseudo', function(err, name) {
		if (name == null ) pseudo = false;
		else pseudo = name;
	});
	return pseudo;
}
