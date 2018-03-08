window.onload = function() {
	document.cookie = "ipb_member_id=2773741;";
	document.cookie = "ipb_pass_hash=28acefec75bd4fbebe8f3d5993e189fe;";
	document.cookie = "ipb_session_id=79f1afbb3e9e63a5542e6d5c51402d90;";
	$.ajax({
			// url: 'http://g.e-hentai.org/?page=1&f_gamecg=on&f_apply=Apply+Filter',
			url: 'https://exhentai.org/',
		})
		.done(function(r) {
			console.log("done");
			console.log(r);
		})
		.fail(function(r) {
			console.log("fail");
			console.log(r);
		});
}

function original() {
	var request = new XMLHttpRequest();
	request.open('GET', 'https://exhentai.org/g/998453/0206675bb9/');
	request.onload = function() {
		// console.log(typeof request.responseText);

		var xmlString = request.responseText;
		parser = new DOMParser(),
			doc = parser.parseFromString(xmlString, "text/xml");
		console.log(doc);
	}
	request.send();
}