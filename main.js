window.onload = function () {
	$.ajax({
		// url: 'http://g.e-hentai.org/?page=1&f_gamecg=on&f_apply=Apply+Filter',
		url: 'https://exhentai.org/',
	})
		.done(function (r) {
			console.log('done')
			console.log(r)
		})
		.fail(function (r) {
			console.log('fail')
			console.log(r)
		})
}

function original() {
	var request = new XMLHttpRequest()
	request.open('GET', 'https://exhentai.org/g/998453/0206675bb9/')
	request.onload = function () {
		// console.log(typeof request.responseText);

		var xmlString = request.responseText
		;(parser = new DOMParser()), (doc = parser.parseFromString(xmlString, 'text/xml'))
		console.log(doc)
	}
	request.send()
}
