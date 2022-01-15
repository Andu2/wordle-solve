const SCORES_TO_SHOW = 20;
// const WORDFILE = "wordlist.10000.txt"
import { WORDS, VALIDGUESSES } from "./wordlists/wordlist.js";
const VALIDWORDS = WORDS.concat(VALIDGUESSES);

function sortKeys(obj, desc) {
	let mult = desc ? 1 : -1;
	return function(a, b) {
		if (obj[b] > obj[a]) return 1 * mult;
		else if (obj[a] > obj[b]) return -1 * mult;
		else return 0;
	}
}

function roundPct(num) {
	return (Math.round(num * 10000) / 100) + "%";
}

function round(num) {
	return Math.round(num * 1000) / 1000
}

function printDist(dist, total) {
	let sortedLetters = Object.keys(dist).sort(sortKeys(dist, true));
	sortedLetters.forEach(function(letter) {
		console.log(letter + ":\t" + roundPct(dist[letter] / total) + "\t(" + dist[letter] + ")");
	});
	console.log("--------------")
}

function printScores(dist) {
	let sortedScores = Object.keys(dist).sort(sortKeys(dist, true));
	for (let i = 0; i < SCORES_TO_SHOW; i++) {
		console.log(sortedScores[i] + " (" + round(dist[sortedScores[i]]) + ")")
	}
	console.log("--------------")
}

function analyzeWordle() {
	let letterDist = [{}, {}, {}, {}, {}];
	let letterDistFull = {};
	let letterDistFullDeduped = {};
	let totalLetters = 0;
	let totalWords = 0;
	let positionScores = {};
	let letterScores = {};

	WORDS.forEach(function(word) {
		let lettersUsed = "";
		for (let i = 0; i < 5; i++) {
			if (!letterDist[i][word[i]]) {
				letterDist[i][word[i]] = 0;
			}
			if (!letterDistFull[word[i]]) {
				letterDistFull[word[i]] = 0;
				letterDistFullDeduped[word[i]] = 0;
			}

			letterDist[i][word[i]]++;
			letterDistFull[word[i]]++;
			if (!lettersUsed.includes(word[i])) {
				letterDistFullDeduped[word[i]]++;
				lettersUsed += word[i];
			}
			totalLetters++;
		}
		totalWords++;
	});

	WORDS.forEach(function(word) {
		let positionScore = 0;
		let letterScore = 0;
		let lettersUsed = "";
		for (let i = 0; i < 5; i++) {
			positionScore += letterDist[i][word[i]] / totalWords;
			if (!lettersUsed.includes(word[i])) {
				letterScore += letterDistFullDeduped[word[i]] / totalWords;
				lettersUsed += word[i];
			}
		}
		positionScores[word] = positionScore;
		letterScores[word] = letterScore;
	});

	console.log("Counted " + totalWords + " 5-letter words");
	printDist(letterDistFull, totalLetters);
	console.log("Chance of appearing at least once in word");
	printDist(letterDistFullDeduped, totalWords);
	for (let i = 0; i < 5; i++) {
		console.log("position " + i)
		printDist(letterDist[i], totalWords);
	}
	console.log("Letter position frequency scores (green result)")
	printScores(positionScores);
	console.log("Letter frequency scores (yellow or green result)")
	printScores(letterScores);
}

analyzeWordle();
