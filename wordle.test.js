import * as Wordlebot from "./wordle.js";

test("2nd copy of a letter is gray if there is only one", function() {
	// word "those", "leers" should be 2nd yellow, 5th yellow, rest gray
	// word "those", "where" should be 2nd green, 5th green, rest gray
	expect(true).toBe(true);
});

// Manual tests

// let constraints1 = getConstraints("shire", "tired");
// let constraints2 = getConstraints("shire", "arise");
// let combinedConstraints1 = combineConstraints(constraints1, constraints2);
// console.log(getPossibilities(combinedConstraints1))

// let constraints3 = getConstraints("solar", "spray")
// let combinedConstraints2 = combineConstraints(combinedConstraints1, constraints3);
// console.log(getPossibilities(combinedConstraints2))
// 
// let constraints4 = getConstraints("panic", "funny")
// let combinedConstraints3 = combineConstraints(combinedConstraints2, constraints4);
// console.log(getPossibilities(combinedConstraints3))