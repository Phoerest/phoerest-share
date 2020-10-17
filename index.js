//Modules used in the script.
const http = require("http"), fd = require("formidable"), fs = require("fs"), os = require("os");
//Declare default arguments. Store arguments passed by the CLI to the script. Get the current working directory when the script was called.
var port = 3000, pass = "1234", theme = 0, args = process.argv, cwd = process.cwd();
//Check if help was requested and print help text to the terminal.
if (args.indexOf("-h") != -1 || args.indexOf("--h") != -1 || args.indexOf("-help") != -1 || args.indexOf("--help") != -1 || args.indexOf("h") != -1 || args.indexOf("help") != -1) {
	console.log("help	To print this text.");
	console.log("port	To change the port number only once. format: port [port-number].");
	console.log("pass	To change the password only once. format: pass [password].");
	console.log("theme	To change the theme only once. format: theme [number 0-3].");
	console.log("save	Save the current arguments permanently.");
}
//If help was not requested, create the required folders to run the script.
else {createRequiredFolders(0, ["tmp", "received", "shared"]);}
//This function will check if a folder exists. If not, it will create it and run the server when done. params: (0, array_of_folder_names) ex: (0, ["folder 1", "folder 2"]).
function createRequiredFolders(i, arr) {
	//Check if folder exists.
	fs.access(cwd + "/" + arr[i], fs.constants.R_OK, function (err) {
		//Check if error exists. The folder might be missing or the folder is not accessible.
		if (err) {
			//Check if the error indicates that the folder does not exists.
			if (err.code == "ENOENT") {
				//Create the missing folder.
				fs.mkdir(cwd + "/" + arr[i], function (err) {
					//Print the error if exists.
					if (err) {console.log(err.message);}
					else {
						//Check if i reached the end of the array. If reached start the server. If not increment it to check the next file in the array.
						if (i < arr.length - 1) {i++; createRequiredFolders(i, arr);} else {startServer();}
					}
				});
			}
			//Print the error.
			else {console.log(err.message);}
		}
		else {
			//Check if i reached the end of the array. If reached start the server. If not increment it to check the next file in the array.
			if (i < arr.length - 1) {i++; createRequiredFolders(i, arr);} else {startServer();}
		}
	});
}
//This function will check the CLI arguments passed to this script.
function checkArgs() {
	//If "port" exists in the arguments array, use the number after it as the port to run the server.
	if (args.indexOf("port") != -1) {port = parseInt(args[args.indexOf("port") + 1]);}
	//If "pass" exists in the arguments array, use the string after it as the password to run the server.
	if (args.indexOf("pass") != -1) {pass = args[args.indexOf("pass") + 1];}
	//If "theme" exists in the arguments array, use the number after it as the theme.
	if (args.indexOf("theme") != -1) {theme = parseInt(args[args.indexOf("theme") + 1]);}
	//If "save" exists in the arguments array, save the current arguments.
	if (args.indexOf("save") != -1) {
		//Write the current arguments to the config.json file permanently. config.json format: {"pass": "[password-string]", "port": "[port-number]"}.
		fs.writeFile(__dirname + "/config.json", "{\"pass\": \"" + pass + "\", \"port\": " + port + ", \"theme\": " + theme + "}", function (err) {
			//Print the error if exists.
			if (err) {console.log(err.message);}
		});
	}
}
//This function will start the server.
function startServer() {
	//Create the server.
	const server = http.createServer(function (req, res) {
		//The following code will be executed after each request to the server after listening starts.
		//Check if the request method is post.
		if (req.method.toLowerCase() == "post") {
			//If the content-type of the request is "multipart", it means a file is received in a form. Start processing the received file.
			if (req.headers["content-type"].indexOf("multipart") != -1) {receiveFile(req, res);}
			//If the content-type of the request is not "multipart", it means the request is to get the shared files. List the files in the shared folder.
			else {listSharedFiles(req, res);}
		}
		//If the request method is not post, serve the requested file.
		else {serveFile(req, res);}
	});
	//Read the config.json file.
	fs.readFile(__dirname + "/config.json", function(err, data) {
		//Print the error if exists.
		if (err) {console.log(err.message);}
		else {
			//Parse the config.json file as JSON object. Assign password, port number and theme to currently used pass, port and theme arguments. Then check the CLI to see if arguments update is requested.
			data = JSON.parse(data); port = data.port; pass = data.pass; theme = data.theme; checkArgs();
			//Start listening on the current port number. Server starts here.
			server.listen(port, function(error) {
				//Print the error if exists.
				if (error) {console.log(error);}
				else {
					//Print server's local IP address to be used by clients to access the sharing service.
					console.log("Your IP address: " + getIPAddress());
					//Print the currently used port number.
					console.log("Server running on port: " + port);
					//Print the URL address to be used by clients to access the sharing service.
					console.log("Visit: http://" + getIPAddress() + ":" + port + "/");
				}
			});
		}
	});
}
//This fuction is used to get the server's local IP address. Code source: https://stackoverflow.com/a/15075395
function getIPAddress() {
	var interfaces = os.networkInterfaces();
	for (var devName in interfaces) {
		var iface = interfaces[devName];
		for (var i = 0; i < iface.length; i++) {var alias = iface[i]; if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) return alias.address;}
	}
	return '0.0.0.0';
}
//This function is used to get the shared folder contents.
function listSharedFiles(req, res) {
	//Get the password from the request data.
	var body = "";
	req.on("data", function(data) {body += data;});
	req.on("end", function () {
		//Password received here. Check if password is correct.
		if (body === pass) {
			//Get the files in the shared folder.
			fs.readdir(cwd + "/shared/", function (err, files) {
				//Print the error if exists.
				if (err) {console.log(err.message);}
				//Get the size of each file found in the shared folder.
				else {getFilesSize(res, 0, files);}
			});
		}
		else {
			//Wrong password. Inform the client.
			res.writeHead(200, {"content-type":"text/html"});
			res.end("Wrong");
		}
	});
}
//This function will get the size of the files and send the name and size to the client. params: (server_response, 0, array_of_files_names) ex: (res, 0, ["file 1", "file 2"]).
function getFilesSize(res, i, files) {
	//Check if reached the end of files array.
	if (i < files.length) {
		//Get the file stat including the size.
		fs.stat(cwd + "/shared/" + files[i], function(err, stat) {
			//Print the error if exists.
			if (err) {console.log(err.message);}
			//Replace file's name with an object of its name and size. Move to the next file.
			else {files[i] = {name: files[i], size: stat.size}; i++; getFilesSize(res, i, files);}
		});
	}
	else {
		//send the files array as string to the client.
		res.writeHead(200, {"content-type":"text/html"});
		res.end(JSON.stringify(files));
	}
}
//This function will receive file chunks and process them and save them on the disk. params: (server_request, server_response) ex: (req, res).
function receiveFile(req, res) {
	//Save the request form files in tmp.
	var form = fd({multiples: true, uploadDir: cwd + "/tmp"});
	//Parse the request form. Expected to contain a file part name, array buffer chunk, password and upload status.
	form.parse(req, function (err, fields, files) {
		//Print the error if exists.
		if (err) {console.log(err.message);}
		else {
			//Check if password if correct.
			if (fields.pass == pass) {
				//Inform the client that the request has ended correctly and the files was received.
				res.writeHead(200, {"content-type":"text/html"});
				res.end();
				//Rename the received chunk to file part name to identify it later when processing it.
				fs.rename(files.chunk.path, cwd + "/tmp/" + fields.fileName, function (err) {
					//Print the error if exists.
					if (err) {console.log(err.message);}
					//Non empty upload status indicates that all file chunks has been received. Expected upload status to contain the final file name and the total chunks number. Start processing the received chunks.
					if (fields.uploadStatus != "") {
						//Create the final file write stream to write chunks to it.
						var w = fs.createWriteStream(cwd + "/received/" + fields.uploadStatus.split(",")[0]);
						//Print to the terminal the name of the received file.
						console.log("Processing: " + fields.uploadStatus.split(",")[0]);
						//Start processing the reveived chunks.
						addBuffer(fields.uploadStatus.split(",")[0], w, 1, parseInt(fields.uploadStatus.split(",")[1]));
					}
				});
			}
			else {
				//Wrong password. Delete the received file from tmp.
				if (files.chunk) {fs.unlink(files.chunk.path, function (err) {if (err) {console.log(err.message);}});}
				//Wrong password. Inform the client.
				res.writeHead(200, {"content-type":"text/html"});
				res.end("Wrong");
			}
		}
	});
}
//This function will merge file chunks into a final file. params: (final_file_name, final_write_stream, 0, final_chunk_number) ex: ("myFile.text", fs.createWriteStream("myFile.text"), 0, 5).
function addBuffer(name, w, i, end) {
	//Create a read stream of the current chunk.
	var r = fs.createReadStream(cwd + "/tmp/" + name + i);
	//When writing the chunk to the final file finishes.
	w.on("close", function () {
		//Delete the processed chunk.
		fs.unlink(cwd + "/tmp/" + name + i, function (err) {if (err) {console.log(err.message);}}); i++;
		//Check if final chunk has reached.
		if (i > end) {
			//Print the final saved file name to the terminal.
			console.log("Saved: " + name);
		}
		else {
			//Get current size of the final file to determine where to write the next chunk.
			fs.stat(cwd + "/received/" + name, function (err, stats) {
				//Print the error if exists.
				if (err) {console.log(err.message);}
				//Create a new write stream for the final file starting from the end of it. 
				var wNext = fs.createWriteStream(cwd + "/received/" + name, {flags: "r+", start: stats.size});
				//Process the next chunk.
				addBuffer(name, wNext, i, end);
			});
		}
	});
	//Pipe the current chunk to the final file.
	r.pipe(w);
}
//This function will get the mime type of an extension. params: (extension_string) ex: ("html").
function getMimeType(ext) {
	//Declare mime types strings in an array.
	var types = ["html", "text/html", "css", "text/css", "js", "text/javascript", "png", "image/png", "jpg", "image/jpeg", "gif", "image/gif", "mp3", "audio/mpeg", "mp4", "video/mp4", "pdf", "application/pdf", "zip", "application/zip", "7z", "application/x-7z-compressed", "ttf", "font/ttf", "json", "application/json"];
	//Return the default mime type.
	if (types.indexOf(ext) == -1) {return "text/html";}
	//Return the mime type specified in types array.
	else {return types[types.indexOf(ext) + 1];}
}
//This function will serve requested files to the client. params: (server_request, server_response) ex: (req, res).
function serveFile(req, res) {
	//Check if the root folder was requested and redirect to index.html
	if (req.url == "/") {res.writeHead(308, {"Location": "index.html"}); res.end(); return;}
	//Set access permission to true, request file directory name to the script directory public folder and the request URL to the client specified URL.
	var access = true, dirNam = __dirname + "/public_html", reqUrl = req.url;
	//Check user's URL parameters and remove them to serve the file without them.
	if (reqUrl.indexOf("?") != -1) {reqUrl = reqUrl.substring(0, reqUrl.indexOf("?"));}
	//Check if the requested file is in shared folder.
	if (req.url.indexOf("shared/") != -1) {
		//Check if the password in the URL parameters is wrong and change access permission to false.
		if (req.url.substring(req.url.lastIndexOf("pass=") + 5, req.url.lastIndexOf("pass=") + 5 + pass.length) != pass) {access = false;}
		//Change the requested file directory name to the cuurent working directory instead of the script directory.
		dirNam = cwd;
	}
	if (reqUrl.indexOf("theme") != -1) {reqUrl = "/css/theme" + theme + ".css";}
	//Check if access permission is true.
	if (access) {
		//Chech if the requested file exists 
		fs.access(dirNam + reqUrl, fs.constants.R_OK, function (err) {
			if (err) {
				//Print file not found if the file is missing or not accessible.
				res.writeHead(404); res.end("<p>Error: not found.</p><br><a href='/'>Home</a>");
			}
			else {
				//Change the response mime type to the requested file mime type.
				res.writeHead(200, {"Content-Type": getMimeType(reqUrl.substr(reqUrl.lastIndexOf(".") + 1))});
				//Create a read stream to the requested file to allow sharing big files and pipe it to the response.
				var r = fs.createReadStream(dirNam + reqUrl); r.pipe(res);
			}
		});
	}
	else {
		//Print file not found if permission is denied. Client doesn't need to need know if the file exists if he has no permission to access it.
		res.writeHead(404); res.end("<p>Error: not found.</p><br><a href='/'>Home</a>");
	}
}