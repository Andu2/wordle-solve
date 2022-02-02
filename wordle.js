import { WORDS, VALIDGUESSES } from "./wordlists/wordlist.js";

const VALIDWORDS = WORDS.concat(VALIDGUESSES);

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function sortKeys(obj, desc) {
	let mult = -1;
	if (desc) mult = 1;
	return function(a, b) {
		if (obj[b] > obj[a]) return 1 * mult;
		else if (obj[a] > obj[b]) return -1 * mult;
		else return 0;
	}
}

function memoize(fn) {
	let lookupTable = {};
	return function() {
		let argString = JSON.stringify(arguments);
		if (!lookupTable[argString]) {
			let result = fn.apply(null, arguments);
			lookupTable[argString] = result;
		}
		return lookupTable[argString];
	}
}

function getNewConstraints() {
	return {
		green: ["", "", "", "", ""],
		yellow: "",
		gray: ""
	}
}

function getConstraints(solution, guess) {
	let constraints = getNewConstraints();
	let solutionCounts = {};
	let guessCounts = {};

	for (let i = 0; i < 5; i++) {
		if (guess[i] === solution[i]) {
			constraints.green[i] = guess[i];
		}
		solutionCounts[solution[i]] = solutionCounts[solution[i]] || 0;
		solutionCounts[solution[i]]++;
		guessCounts[guess[i]] = guessCounts[guess[i]] || 0;
		guessCounts[guess[i]]++;
	}

	let greens = constraints.green.join("");
	for (let letter in guessCounts) {
		if (greens.includes(letter)) {
			if (solutionCounts[letter] > guessCounts[letter]) {
				constraints.yellow += letter;
			}
			else if (solutionCounts[letter] < guessCounts[letter]) {
				constraints.gray += letter;
			}
		}
		else {
			if (solutionCounts[letter]) {
				constraints.yellow += letter;
			}
			else {
				constraints.gray += letter;
			}
		}
	}

	return constraints;
}

function combineConstraints(currentConstraints, newConstraints) {
	let combinedGreen = currentConstraints.green.slice();
	for (let i = 0; i < 5; i++) {
		if (newConstraints.green[i]) {
			combinedGreen[i] = newConstraints.green[i];
		}
	}

	let newGreens = newConstraints.green.join("");
	let combinedYellow = removeDupeLetters(currentConstraints.yellow + newConstraints.yellow);
	// Yellow can become gray or undefined if they become green
	combinedYellow = removeListLetters(combinedYellow, newConstraints.gray + newGreens);

	let combinedGray = removeDupeLetters(currentConstraints.gray + newConstraints.gray);

	return {
		green: combinedGreen,
		yellow: combinedYellow,
		gray: combinedGray
	}
}

function isSolved(constraints) {
	for (let i = 0; i < 5; i++) {
		if (!constraints.green[i]) return false;
	}
	return true;
}

function removeDupeLetters(letters) {
	let letterArray = letters.split("");
	return letterArray.filter(function(letter, i) {
		return letterArray.indexOf(letter) === i;
	}).join("");
}

function removeListLetters(letters, list) {
	let letterArray = letters.split("");
	return letterArray.filter(function(letter) {
		return !list.includes(letter);
	}).join("");
}

let getPossibilities = memoize(function(constraints) {
	let mustInclude = constraints.yellow;
	let cantInclude = constraints.gray;
	//let mayInclude = removeListLetters(LETTERS, cantInclude);
	return WORDS.filter(function(word) {
		let lettersLeftToInclude = mustInclude;
		for (let i = 0; i < 5; i++) {
			if (constraints.green[i]) {
				if (word[i] !== constraints.green[i]) return false;
				else continue; // green can also be gray
			}
			if (cantInclude.includes(word[i])) return false;
			if (lettersLeftToInclude.includes(word[i])) {
				lettersLeftToInclude = removeListLetters(lettersLeftToInclude, word[i]);
			}
		}
		if (lettersLeftToInclude.length > 0) return false;
		return true;
	});
});

function evaluateGuess(guess, currentConstraints) {
	let wordPossibilities = {};
	let totalPossibilities = 0;
	let wordList = getPossibilities(currentConstraints);
	wordList.forEach(function(word) {
		let newConstraints = getConstraints(word, guess);
		let combinedConstraints = combineConstraints(currentConstraints, newConstraints);
		let possibilities = getPossibilities(combinedConstraints);
		wordPossibilities[word] = possibilities.length;
		totalPossibilities += possibilities.length;
	});
	return totalPossibilities / wordList.length;
}

function printTopGuesses(constraints, opts = {}) {
	let time = Date.now();

	let guessEvaluations = {};
	let wordList = VALIDWORDS;
	if (opts.onlyTryPossibilities) {
		wordList = getPossibilities(constraints);
	}
	console.log("Testing " + wordList.length + " possibilities");
	wordList.forEach(function(guess, i) {
		guessEvaluations[guess] = evaluateGuess(guess, constraints);
	});

	let sortedGuesses = Object.keys(guessEvaluations).sort(sortKeys(guessEvaluations));
	for (let i = 0; i < sortedGuesses.length; i++) {
		console.log(sortedGuesses[i] + ": " + guessEvaluations[sortedGuesses[i]]);
	}

	let timeTaken = Date.now() - time;
	console.log(timeTaken + "ms")
}

// Pre-programmed first guesses because algorithm takes several minutes on first guess
const FIRST_GUESSES = [ 
	"roate", "raise", "raile", "soare", "irate", 
	"orate", "artel", "ariel", "arise", "taler", 
	"arose", "arles", "ratel", "aesir", "alter", 
	"later", "tares", "alert", "realo", "strae"
];

function chooseGuess(constraints) {
	let guessEvaluations = {};
	let checkList = VALIDWORDS;
	let possibleSolutions = getPossibilities(constraints);

	if (possibleSolutions.length === WORDS.length) {
		// return FIRST_GUESSES[0];
		return FIRST_GUESSES[Math.floor(Math.random() * FIRST_GUESSES.length)];
	}
	else if (true || possibleSolutions.length > 50 || possibleSolutions.length < 10) {
		checkList = possibleSolutions;
	}

	console.log("Testing " + checkList.length + " possibilities for " + possibleSolutions.length + " possible solutions");
	checkList.forEach(function(guess, i) {
		guessEvaluations[guess] = evaluateGuess(guess, constraints);
	});

	let sortedGuesses = Object.keys(guessEvaluations).sort(sortKeys(guessEvaluations));
	return sortedGuesses[0];
}

function test() {
	let solution = WORDS[Math.floor(Math.random() * WORDS.length)];
	console.log("Word is " + solution)
	let currentConstraints = getNewConstraints();
	let steps = 0;
	let time = Date.now();

	do {
		steps++;
		let nextGuess = chooseGuess(currentConstraints);
		console.log("Step " + steps + ": Guessing " + nextGuess);
		let newConstraints = getConstraints(solution, nextGuess);
		currentConstraints = combineConstraints(currentConstraints, newConstraints);
		console.log(currentConstraints);
	} while (!isSolved(currentConstraints));

	console.log("Solved in " + steps + " steps")
	let timeTaken = Date.now() - time;
	console.log(timeTaken + "ms")
}

function typeGuess(guess) {
	for(let i = 0; i < 5; i++) {
		window.dispatchEvent(new KeyboardEvent("keydown", { "key": guess[i] }));
	}
	window.dispatchEvent(new KeyboardEvent("keydown", { "key": "Enter" }));
}

function getConstraintsFromApp() {
	let rows = document.querySelector("game-app").shadowRoot.querySelector("div#board").querySelectorAll("game-row");
	let constraints = getNewConstraints();
	for (let i = 0; i < 6; i++) {
		let rowConstraints = getNewConstraints();
		let letters = rows[i].shadowRoot.querySelectorAll("game-tile");
		for (let i = 0; i < 5; i++) {
			let letter = letters[i].getAttribute("letter");
			let result = letters[i].getAttribute("evaluation");
			if (result === "absent") rowConstraints.gray += letter;
			else if (result === "present") rowConstraints.yellow += letter;
			else if (result === "correct") rowConstraints.green[i] = letter;
		}
		rowConstraints.yellow = removeDupeLetters(rowConstraints.yellow);
		rowConstraints.gray = removeDupeLetters(rowConstraints.gray);
		constraints = combineConstraints(constraints, rowConstraints);
	}
	return constraints;
}

function nextGuess() {
	let currentConstraints = getConstraintsFromApp();
	console.log(currentConstraints);
	if (!isSolved(currentConstraints)) {
		let nextGuess = chooseGuess(currentConstraints);
		typeGuess(nextGuess);
	}
}

if (typeof window !== "undefined") {
	nextGuess();
}
else {
	// test();
}

// Manual tests

let constraints1 = getConstraints("shire", "tired");
let constraints2 = getConstraints("shire", "arise");
let combinedConstraints1 = combineConstraints(constraints1, constraints2);
console.log(getPossibilities(combinedConstraints1))

// let constraints3 = getConstraints("solar", "spray")
// let combinedConstraints2 = combineConstraints(combinedConstraints1, constraints3);
// console.log(getPossibilities(combinedConstraints2))
// 
// let constraints4 = getConstraints("panic", "funny")
// let combinedConstraints3 = combineConstraints(combinedConstraints2, constraints4);
// console.log(getPossibilities(combinedConstraints3))

// printTopGuesses(getNewConstraints(), { onlyTryPossibilities: false });

// roate: 86.17494600431965
// raise: 87.29892008639308
// raile: 87.89200863930886
// soare: 88.50885529157668
// irate: 88.70626349892008
// orate: 88.82203023758099
// artel: 89.34686825053996
// ariel: 89.3866090712743
// arise: 89.61900647948164
// taler: 91.01123110151188
// arose: 91.35680345572354
// arles: 91.54859611231102
// ratel: 91.81641468682506
// aesir: 91.87904967602591
// alter: 92.0669546436285
// later: 92.58617710583154
// tares: 92.70669546436285
// alert: 92.83628509719223
// realo: 92.86565874730022
// strae: 92.93131749460044
