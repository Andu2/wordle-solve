import { WORDS, VALIDGUESSES } from "./wordlists/wordlist.js";

const VALIDWORDS = WORDS.concat(VALIDGUESSES);
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

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
		let argString = Array.prototype.slice.call(arguments);
		if (!lookupTable[argString]) {
			let result = fn.apply(null, arguments);
			lookupTable[argString] = result;
		}
		return lookupTable[argString];
	}
}

let timers = {};
let timesRun = {};
let unknownFns = 0;
function timeFunction(fn) {
	let timerName = fn.name || "Unknown function " + (unknownFns++);
	timers[timerName] = 0;
	timesRun[timerName] = 0;
	return function() {
		let startTime = Date.now();
		let result = fn.apply(null, arguments);
		timers[timerName] += Date.now() - startTime;
		timesRun[timerName]++;
		return result;
	}
}

function logFunctionTime() {
	for (let timerName in timers) {
		console.log(timerName + ": " + (timers[timerName] / 1000) + " seconds (executed " + timesRun[timerName] + " times)")
	}
}

function getNewConstraints() {
	let newConstraints = {
		guessed: []
	};
	for (var i = 0; i < LETTERS.length; i++) {
		newConstraints[LETTERS[i]] = {
			positions: [],
			excluded: [],
			min: 0,
			max: 4
		}
	}
	return newConstraints;
}
getNewConstraints = timeFunction(getNewConstraints);

function getConstraints(solution, guess) {
	let constraints = getNewConstraints();
	let numLeft = {};

	for (let i = 0; i < WORD_LENGTH; i++) {
		constraints.guessed.push(guess[i]);
		numLeft[solution[i]] = numLeft[solution[i]] || 0;
		if (guess[i] === solution[i]) {
			// green
			constraints[guess[i]].min++;
			constraints[guess[i]].positions.push(i);
		}
		else {
			// yellow or gray
			constraints[guess[i]].excluded.push(i);
			numLeft[solution[i]]++;
		}
	}

	for (let i = 0; i < WORD_LENGTH; i++) {
		if (guess[i] !== solution[i]) {
			if (numLeft[guess[i]]) {
				// yellow
				constraints[guess[i]].min++;
				numLeft[guess[i]]--;
			}
			else {
				// gray
				constraints[guess[i]].max = constraints[guess[i]].min;
			}
		}
	}

	constraints.guessed = removeDupes(constraints.guessed);
	return constraints;
}
getConstraints = memoize(getConstraints);
getConstraints = timeFunction(getConstraints);

function combineConstraints(currentConstraints, newConstraints) {
	let combinedConstraints = {
		guessed: removeDupes(currentConstraints.guessed.concat(newConstraints.guessed))
	};
	for (var i = 0; i < LETTERS.length; i++) {
		combinedConstraints[LETTERS[i]] = {
			positions: removeDupes(currentConstraints[LETTERS[i]].positions.concat(newConstraints[LETTERS[i]].positions)),
			excluded: removeDupes(currentConstraints[LETTERS[i]].excluded.concat(newConstraints[LETTERS[i]].excluded)),
			min: Math.max(currentConstraints[LETTERS[i]].min, newConstraints[LETTERS[i]].min),
			max: Math.min(currentConstraints[LETTERS[i]].max, newConstraints[LETTERS[i]].max)
		}
	}
	return combinedConstraints;
}
combineConstraints = timeFunction(combineConstraints);

function simplifyConstraints(constraints) {
	// okay to modify
	
}

// Our letter constraint representations are 16 bits, which happens to fit Javascript's UTF-16 strings
function constraintsObjToString(constraints) {
	let constraintInts = [];
	for (var i = 0; i < LETTERS.length; i++) {
		constraintInts[i] = letterConstraintsObjToInt(constraints[LETTERS[i]]);
	}
	return String.fromCharCode.apply(null, constraintInts);
}
constraintsObjToString = timeFunction(constraintsObjToString);

function constraintsStringToObj(constraintString) {
	let constraints = {};
	for (var i = 0; i < LETTERS.length; i++) {
		let constraintInt = constraintString.charCodeAt(i);
		constraints[LETTERS[i]] = letterConstraintsIntToObj(constraintInt);
	}
	return constraints;
}
constraintsStringToObj = timeFunction(constraintsStringToObj);

// 00000 00000 000 000
// incl  excl  min max
function letterConstraintsObjToInt(letterConstraints) {
	// if (letterConstraints.max === 0) return 0; // incl/excl don't matter if max 0, so don't make unnecessary distinctions
	let letterConstraintsInt = letterConstraints.max | (letterConstraints.min << 3);
	let excl = 0;
	letterConstraints.excluded.forEach(function(pos) {
		excl = excl | (1 << pos);
	});
	letterConstraintsInt = letterConstraintsInt | (excl << 6);
	let incl = 0;
	letterConstraints.positions.forEach(function(pos) {
		incl = incl | (1 << pos);
	});
	letterConstraintsInt = letterConstraintsInt | (incl << 11);
	return letterConstraintsInt;
}

function letterConstraintsIntToObj(letterConstraintsInt) {
	let max = letterConstraintsInt & 0b0000000000000111;
	let min = (letterConstraintsInt & 0b0000000000111000) >> 3;
	let excl = (letterConstraintsInt & 0b0000011111000000) >> 6;
	let incl = (letterConstraintsInt & 0b1111100000000000) >> 11;
	let constraints = {
		positions: getPositionListFromInt(incl),
		excluded: getPositionListFromInt(excl),
		min: min,
		max, max
	}
	return constraints;
}

function getPositionListFromInt(int) {
	let list = [];
	if (!int) return list;
	for (let i = 0; i < WORD_LENGTH; i++) {
		if ((int >> i) & 1) {
			list.push(i);
		}
	}
	return list;
}

function isSolved(constraints) {
	let positionCount = 0;
	for (let letter of LETTERS) {
		positionCount += constraints[letter].positions.length;
	}
	return positionCount === WORD_LENGTH;
}

function removeDupes(arr) {
	return arr.filter(function(val, i) {
		return arr.indexOf(val) === i;
	});
}

let wordFitCache = {};
function wordFitsConstraintsMemo(constraints, word) {
	let constraintsKey = constraintsObjToString(constraints);
	let wordFitKey = constraintsKey + word;
	if (!wordFitCache[wordFitKey]) {
		wordFitCache[wordFitKey] = wordFitsConstraints(constraints, word);
	}
	return wordFitCache[wordFitKey];
}

function getLetterCounts(word) {
	let letterCounts = {};
	for (let i = 0; i < WORD_LENGTH; i++) {
		letterCounts[word[i]] = letterCounts[word[i]] || 0;
		letterCounts[word[i]]++;
	}
	return letterCounts;
}
getLetterCounts = memoize(getLetterCounts);

function wordFitsConstraints(constraints, word) {
	let letterCounts = getLetterCounts(word);

	// Save some time by limiting checks to letters we've guessed
	for (let letter of constraints.guessed) {
		for (let pos of constraints[letter].positions) {
			if (word[pos] !== letter) return false;
		}

		for (let pos of constraints[letter].excluded) {
			if (word[pos] === letter) return false;
		}

		if (letterCounts[letter]) {
			if (letterCounts > constraints[letter].max) return false;
			else if (letterCounts < constraints[letter].min) return false;
		}
		else if (constraints[letter].min > 0) return false;
	}
	return true;
}
wordFitsConstraints = timeFunction(wordFitsConstraints);

let possibilitiesCache = {};
function getPossibilities(constraints, options = {}) {
	// options.currentPossibilities MUST BE CORRECT, otherwise the cache is fucked
	let constraintsKey = constraintsObjToString(constraints);
	if (!possibilitiesCache[constraintsKey]) {
		let wordList = options.currentPossibilities || WORDS;
		possibilitiesCache[constraintsKey] = wordList.filter(function(word) {
			return wordFitsConstraints(constraints, word);
		});
	}
	return possibilitiesCache[constraintsKey];
}

// for testing
let possibilitiesJsonCache = {};
function getPossibilitiesJsonCache(constraints) {
	let constraintsKey = JSON.stringify(constraints);
	if (!possibilitiesJsonCache[constraintsKey]) {
		possibilitiesJsonCache[constraintsKey] = WORDS.filter(function(word) {
			return wordFitsConstraints(constraints, word);
		});
	}
	return possibilitiesJsonCache[constraintsKey];
}

function evaluateGuess(guess, currentConstraints) {
	let wordPossibilities = {};
	let totalPossibilities = 0;
	let wordList = getPossibilities(currentConstraints);
	wordList.forEach(function(word) {
		let newConstraints = getConstraints(word, guess);
		let combinedConstraints = combineConstraints(currentConstraints, newConstraints);
		let possibilities = getPossibilities(combinedConstraints, { currentPossibilities: wordList });
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
		if (i > 20) return;
		guessEvaluations[guess] = evaluateGuess(guess, constraints);
		if (i % 100 === 0) {
			console.log(i + ":: " + guess + ": " + guessEvaluations[guess])
		}
	});

	let sortedGuesses = Object.keys(guessEvaluations).sort(sortKeys(guessEvaluations));
	for (let i = 0; i < sortedGuesses.length; i++) {
		console.log(sortedGuesses[i] + ": " + guessEvaluations[sortedGuesses[i]]);
	}

	let timeTaken = Date.now() - time;
	console.log(timeTaken + "ms")
	logFunctionTime();
}

// Pre-programmed first guesses because algorithm takes several minutes on first guess
const FIRST_GUESSES = [ 
	"roate", "raise", "raile", "soare", "irate", 
	"orate", "artel", "ariel", "arise", "taler", 
	"arose", "arles", "ratel", "aesir", "alter", 
	"later", "tares", "alert", "realo", 
	"strae"
];

function chooseGuess(constraints) {
	let guessEvaluations = {};
	let checkList = VALIDWORDS;

	let possibleSolutions = getPossibilities(constraints);
	if (possibleSolutions <= 0) {
		console.log(constraints);
		throw Error("No possible solutions");
	}
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
		// if (i % 100 === 0) {
		// 	console.log(i + ":: " + guess + ": " + guessEvaluations[guess])
		// }
	});

	let sortedGuesses = Object.keys(guessEvaluations).sort(sortKeys(guessEvaluations));
	return sortedGuesses[0];
}

function pickRandomSolution() {
	return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function test() {
	let solution = pickRandomSolution();
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
	} while (!isSolved(currentConstraints));

	console.log("Solved in " + steps + " steps")
	let timeTaken = Date.now() - time;
	console.log(timeTaken + "ms")
	logFunctionTime();
}

function typeGuess(guess) {
	for(let i = 0; i < WORD_LENGTH; i++) {
		window.dispatchEvent(new KeyboardEvent("keydown", { "key": guess[i] }));
	}
	window.dispatchEvent(new KeyboardEvent("keydown", { "key": "Enter" }));
}

function getConstraintsFromApp() {
	let rows = document.querySelector("game-app").shadowRoot.querySelector("div#board").querySelectorAll("game-row");
	let constraints = getNewConstraints();
	for (let i = 0; i < MAX_GUESSES; i++) {
		let rowConstraints = getNewConstraints();
		let letters = rows[i].shadowRoot.querySelectorAll("game-tile");
		for (let i = 0; i < WORD_LENGTH; i++) {
			let letter = letters[i].getAttribute("letter");
			let result = letters[i].getAttribute("evaluation");
			if (result === "absent") rowConstraints.gray += letter;
			else if (result === "present") rowConstraints.yellow[i] += letter;
			else if (result === "correct") rowConstraints.green[i] = letter;
		}
		rowConstraints.yellow = rowConstraints.yellow.map(removeDupeLetters);
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
	test();

	// while (true) {
	// 	let word1 = pickRandomSolution();
	// 	let word2 = pickRandomSolution();
	// 	let testConstraints = getConstraints(word1, word2);
	// 	let possibilities = getPossibilities(testConstraints);
	// 	let possibilities2 = getPossibilitiesJsonCache(testConstraints);
	// 	if (possibilities.length !== possibilities2.length) {
	// 		console.log(word1, word2)
	// 		console.log(possibilities.length, possibilities2.length);
	// 		let constraintString = constraintsObjToString(testConstraints);
	// 		let equivalent = [];
	// 		for (let key in possibilitiesJsonCache) {
	// 			let constraintObjCache = JSON.parse(key);
	// 			let constraintStringCache = constraintsObjToString(constraintObjCache);
	// 			if (constraintStringCache === constraintString) {
	// 				equivalent.push(constraintObjCache);
	// 			}
	// 		}
	// 		console.log(equivalent.length, equivalent)
	// 		// let constraintsObj = constraintsStringToObj(constraintString);
	// 		// console.log(testConstraints, constraintsObj);
	// 	}
	// }
}

// printTopGuesses(getNewConstraints(), { onlyTryPossibilities: true });

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
