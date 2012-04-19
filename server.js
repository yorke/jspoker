var sys = require("util"),  
    http = require("http"),  
    url = require("url"),  
    path = require("path"),  
    fs = require("fs"),
    qs = require("querystring");  
    
//Include the game manager code
var game = require("./gamemanager.js");
var httpServer = http.createServer(function(request, response) {  
	if (request.method == "POST") {

	} else if (request.method == "GET") {
	    var url_parts = url.parse(request.url,true);
	    if (url_parts.query.load == 'true') {
	    console.log(url_parts.query);
	    	dropbox.getFile('Codebox/code.txt', function(err, data) {
	    		if(err) {
					response.writeHead(404, {"Content-Type": "text/plain"});  
			        response.write("Blahblahblah\n");  
			        response.end();	  
			        return;  			
	    		} else {
	    			response.writeHead(200, {"Content-Type": "text/plain"});  
			        response.write(data);  
			        response.end();	    			
			        return;
	    		}
	    	});
			return;
	    }
	    var uri = url.parse(request.url).pathname;  
	    var filename = path.join(".\\www\\", uri);  
	    path.exists(filename, function(exists) {  
	        if(!exists) {  
	            response.writeHead(404, {"Content-Type": "text/plain"});  
	            response.write("404 Not Found\n");  
	            response.end();  
	            return;  
	        }  
	  
	        fs.readFile(filename, "binary", function(err, file) {  
	            if(err) {  
	                response.writeHead(500, {"Content-Type": "text/plain"});  
	                response.write(err + "\n");  
	                response.end();  
	                return;  
	            }  
	  
	            response.writeHead(200);  
	            response.write(file, "binary");  
	            response.end();  
	        });  
	    });
	}
}).listen(8080);  

var nowjs = require("now");
var everyone = nowjs.initialize(httpServer,{socketio: {transports: ['xhr-polling', 'jsonp-polling', 'htmlfile']}});
console.log('Server running at http://127.0.0.1:8080/');

game.addNewPlayer("yorke", 100);
game.addNewPlayer("yorke2", 100);
game.addNewPlayer("yorke3", 100);
game.addNewPlayer("yorke4", 100);

//game.dealNextHand();

//deck.test();
var stdin = process.openStdin();
stdin.on('data', function(input) { game.performActionTextWrapper(input); });


