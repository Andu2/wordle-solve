const fs = require("fs");
const readline = require("readline");

const WORDFILE = "wordlist.10000.txt"

function dumpWords() {
	let reader = readline.createInterface({
		input: fs.createReadStream(WORDFILE)
	})

	reader.on("line", function(line) {
		if (line.length === 5) {
			console.log(line)
		}
	});
}

dumpWords();
