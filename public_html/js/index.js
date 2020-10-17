//Declare default chunk size.
var chunkSize = 50000000;
//This function is used to show and hide the entered password when clicking the eye icon next to the password input field. params (clicked_icon_element, icon_index_to_show, pass_input_type) ex: (this, 1, "password").
function showPass(ele, index, type) {
	//Hide the clicked icon.
	ele.style.display = "none";
	//Show the other icon.
	ele.parentElement.children[index].style.display = "block";
	//Change the input field type.
	ele.parentElement.children[2].type = type;
}
//This function is used to list the user selected files names and sizes.
function listSelectedFiles() {
	//Get the selected files.
	var files = document.getElementById("userFileInput").files,
	//Get the container to list the files in.
	selectedFilesContainer = document.getElementById("selectedFilesContainer");
	//Clear the container from previously listed files.
	selectedFilesContainer.innerHTML = "";
	//Loop through the selected files and list them in the container.
	for (var i = 0;i < files.length;i++) {selectedFilesContainer.innerHTML += "<div><div class=\"filelistEntry\">" + files[i].name + " - " + getSizeString(files[i].size) + "</div><div class=\"seperator\"></div></div>";}
}
//This function is used to start uploading the selected files.
function uploadFile() {
	//Get the user entered chunk size.
	var chunkSizeInput = parseInt(document.getElementById("userChunkSizeInput").value);
	//Check if the entered chunk size if valid. It should be bigger than 0. If not set it to the default 5000000 bytes (5MB).
	if (chunkSizeInput > 0) {chunkSize = chunkSizeInput;} else {chunkSize = 50000000;}
	//Get the selected files.
	var files = document.getElementById("userFileInput").files;
	//Clear the upload status field to indicate that a file send is starting.
	document.getElementById("uploadStatusField").value = "";
	//Store user entered password in the hidden form to submit it.
	document.getElementById("userPassField").value = document.getElementById("userPassInput").value;
	//Check if user has selected any files.
	if (files.length == 0) {alert("Open files to upload!");}
	//Loop through the selected files and start sending them.
	else {for (var i = 0;i < files.length;i++) {sendChunk(i, 0);}}
}
//This function is used to send a chunk of a file to the server. params (file_index, chunk_index) ex: (0, 0)
function sendChunk(fileIndex, chunkIndex) {
	//Get the current file. Declare a new http request.
	var chunk, file = document.getElementById("userFileInput").files[fileIndex], xhtp = new XMLHttpRequest(), formData;
	//Check if reached the end of the file. If reached, slice the file from the last chunk to the end of the file. If not, slice the file from the last chunk to the next chunk based on user entered chunk size.
	if (chunkIndex+chunkSize < file.size) {chunk = file.slice(chunkIndex, chunkIndex+chunkSize);}
	else {chunk = file.slice(chunkIndex, file.size); document.getElementById("uploadStatusField").value = file.name + "," + ((chunkIndex+chunkSize)/chunkSize);}
	//Set the file name to the sending chunk number.
	document.getElementById("fileNameField").value = file.name + ((chunkIndex+chunkSize)/chunkSize);
	//Create a new form data from the form in the html document.
	formData = new FormData(document.getElementById("fileForm"));
	//Append the new chunk to the form.
	formData.append("chunk", chunk);
	//When the http request loads.
	xhtp.onload = function() {
		//If the srever responded with "Wrong" it means that the user entered password is wrong.
		if (xhtp.response == "Wrong") {alert("Wrong password!");}
		else {
			//Get the current file view container.
			var uploadProgress = document.getElementById("selectedFilesContainer").children[fileIndex].children[0];
			// Move chunk index to the next chunk.
			chunkIndex += chunkSize;
			//Check if more chunks are left to send. If true, write the current upload progress and send the next chunk. If false, write that the upload of this file is done.
			if (chunkIndex < file.size) {uploadProgress.innerHTML = file.name + " - " + getSizeString(file.size) + " .... Uploading: " + parseInt((chunkIndex / chunkSize) * 100 / (file.size / chunkSize)) + "%"; sendChunk(fileIndex, chunkIndex);}
			else {uploadProgress.innerHTML = file.name + " - " + getSizeString(file.size) + " .... Done";}
		}
	};
	//Set the request method to post and the request page to the current page with asynchronous call.
	xhtp.open("POST", "/", true);
	//Send the form to the server.
	xhtp.send(formData);
	//Clear the upload status field to allow other files to be sent.
	document.getElementById("uploadStatusField").value = "";
}
//This function is used to get a more readable file size string from bytes. params (bytes) ex: (1024) return (1KB).
function getSizeString(bytes) {
	//Declare unites string. Convert the bytes to string and get its maximum thousand weight.
	var sizes = ["B", "KB", "MB", "GB", "TB"], strSize = Math.floor(String(bytes).length / 3);
	//Devide the bytes by 1024 power the bytes maximum thousand weight and add the proper unit string.
	return (bytes / Math.pow(1024, strSize)).toFixed(2) + sizes[strSize];
}
//This function is used to get a list of the server shared files.
function getFiles() {
	//Create a new http request. Get the shared files container to list the files in.
	var xhtp = new XMLHttpRequest(), res, sharedFilesContainer = document.getElementById("sharedFilesContainer");
	//Clear the container from previously listed files.
	sharedFilesContainer.innerHTML = "";
	//When the http request loads.
	xhtp.onload = function() {
		//If the srever responded with "Wrong" it means that the user entered password is wrong.
		if (xhtp.response == "Wrong") {alert("Wrong password!");}
		else {
			//Parse the response as an array of objects.
			res = JSON.parse(xhtp.response);
			//Check if the array is empty. If empty, inform the user with "No files!" message.
			if (res.length == 0) {alert("No files!");}
			//Loop through the files array and list the file name, size and link with password as a parameter.
			for (var i = 0;i < res.length;i++) {sharedFilesContainer.innerHTML += "<a href=\"shared/" + res[i].name + "?pass=" + document.getElementById("userPassInput").value + "\"><div class=\"filelistEntry\">" + res[i].name + " - " + getSizeString(res[i].size) +"</div></a><div class=\"seperator\"></div>";}
		}
	};
	//Set the request method to post and the request page to the current page with asynchronous call.
	xhtp.open("POST", "/", true);
	//Set the request header to "text/html" to indicate files request.
	xhtp.setRequestHeader("Content-Type", "text/html");
	//Send the request with the user entered password.
	xhtp.send(document.getElementById("userPassInput").value);
}