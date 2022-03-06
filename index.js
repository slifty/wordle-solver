const fs = require('fs');

function decodeWord(encodedWord) {
	return Buffer.from(encodedWord, 'base64').toString('ascii')
}

// We might want new kinds of answer grids in future algorithm versions
function generateGuessPatterns(resultValues = []) {
	const guessLength = 5 // idk maybe there will be a longer wordle some day
	const guessPatterns = Array.from(Array(guessLength - 1)).reduce(
		(partialPatterns) => partialPatterns.flatMap(
			partialPattern => resultValues.map(
				resultValue => `${partialPattern}${resultValue}`,
			),
		),
		resultValues,
	)
	return guessPatterns
}

function generateMatchPattern(answer, guessPattern) {
	const matchPatternString = Array.from(guessPattern).map(
		(character, index) => {
			switch (character) {
			case '_':
				return `[^${answer}]`
			case 'x':
				return answer.charAt(index)
			case '?':
				return `[${answer.slice(0,index)}${answer.slice(index + 1)}]`
			}
		}
	).join('')
	const matchPattern = RegExp(`^${matchPatternString}$`)
	return matchPattern
}

function getMatchCount(answer, guessPattern, words) {
	const matchPattern = generateMatchPattern(answer, guessPattern)
	const matches = words.filter(
		word => matchPattern.test(word),
	)
	return matches.length
}

function shuffle(arr) {
  return arr.map(value => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value)
}

function preprocess(encodedWordPool) {
	const decodedWordPool = encodedWordPool.map(encodedWord => decodeWord(encodedWord))
	const guessPatterns = generateGuessPatterns(['_', '?', 'x'])
	const processedWordPool = encodedWordPool.reduce((processedWordPool, encodedWord, index) => {
		const decodedWord = decodeWord(encodedWord)
		const matchCounts = guessPatterns.reduce(
			(guesses, guessPattern) => ({
				...guesses,
				[guessPattern]: getMatchCount(
					decodedWord,
					guessPattern,
					decodedWordPool,
				)
			}),
			{},
		)
		console.log(`${index} / ${encodedWordPool.length}`)
		return {
			...processedWordPool,
			[encodedWord]: matchCounts,
		}
	}, {})
	return processedWordPool
}

function countUniqueLetters(word) {
	return [...new Set(word)].length
}

function getWeightedWordScore(wordScore) {
	return {
		...wordScore,
		weightedScore: wordScore.score * countUniqueLetters(wordScore.word),
	}
}

function getViableOptions(
	encodedWordPool,
	processedWords,
	guessPatterns,
) {
	const wordScores = {}
	encodedWordPool.forEach(word => wordScores[word] = {
		patterns: {},
		score: 0,
		word: decodeWord(word),
	})
	const viableOptions = guessPatterns.reduce(
		(viableWords, guessPattern) => {
			return viableWords.filter(
				(word) => {
					wordScores[word].score = wordScores[word].score + processedWords[word][guessPattern]
					wordScores[word].patterns[guessPattern] = processedWords[word][guessPattern]
					return processedWords[word][guessPattern] !== 0
				}
			)
		},
		encodedWordPool,
	)

	const scoredOptions = viableOptions.map(viableOption => [viableOption, getWeightedWordScore(wordScores[viableOption])])
	scoredOptions.sort((a, b ) => (a[1].weightedScore <= b[1].weightedScore) ? 1 : -1)

	return scoredOptions
}

function filterByKnowledge(
	viableOptions,
	knownLetters,
) {
	return knownLetters.reduce(
		(filteredOptions, knownLetter) => {
			switch (knownLetter.type) {
			case '_':
				return filteredOptions.filter(
					viableOption => !viableOption[1].word.includes(knownLetter.value)
				)
			case '?':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.includes(knownLetter.value)
				)
			case '1':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(0) === knownLetter.value
				)
			case '2':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(1) === knownLetter.value
				)
			case '3':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(2) === knownLetter.value
				)
			case '4':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(3) === knownLetter.value
				)
			case '5':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(4) === knownLetter.value
				)
			case '_1':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(0) !== knownLetter.value
				)
			case '_2':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(1) !== knownLetter.value
				)
			case '_3':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(2) !== knownLetter.value
				)
			case '_4':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(3) !== knownLetter.value
				)
			case '_5':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(4) !== knownLetter.value
				)
			case '?1':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(0) !== knownLetter.value
						&& viableOption[1].word.includes(knownLetter.value)
				)
			case '?2':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(1) !== knownLetter.value
						&& viableOption[1].word.includes(knownLetter.value)
				)
			case '?3':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(2) !== knownLetter.value
						&& viableOption[1].word.includes(knownLetter.value)
				)
			case '?4':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(3) !== knownLetter.value
						&& viableOption[1].word.includes(knownLetter.value)
				)
			case '?5':
				return filteredOptions.filter(
					viableOption => viableOption[1].word.charAt(4) !== knownLetter.value
						&& viableOption[1].word.includes(knownLetter.value)
				)
			}
		},
		viableOptions,
	)
}

const encodedAnswers = JSON.parse(fs.readFileSync('data/encodedAnswers.json'));
const encodedWords = JSON.parse(fs.readFileSync('data/encodedWords.json'));
const encodedWordPool = shuffle([
	...encodedAnswers,
	...encodedWords,
])

// This only has to be run once...
// const processedWords = preprocess(encodedWordPool);
// fs.writeFileSync('data/processedWords.json', JSON.stringify(processedWords))
const processedWords = JSON.parse(fs.readFileSync('data/processedWords.json'));

// Any SHARE results go here.
// _ means black box (miss)
// x means green box (hit)
// ? means yellow box (displaced)
guessPatterns = [
	// e.g. 'xx_?_',
]

const viableOptions = getViableOptions(
	encodedWordPool,
	processedWords,
	guessPatterns,
)

// Any known letter info goes here.
// #, where # is 1-5, means "this is the "1st / 2nd / etc" letter of the word
// ? means this letter exists somewhere in the word
// _ means the letter does NOT exist in the word
// _#, where # is 1-5, means the letter is NOT the 1st / 2nd / etc letter of the word
// ?#, where # is 1-5, means the letter exists and is NOT the 1st / 2nd / etc letter of the word
const knownLetters = [
	// { value: 'b', type: '?5'},
]

console.log(`${viableOptions.length} viable options`)

const informedViableOptions = filterByKnowledge(
	viableOptions,
	knownLetters,
)

console.log(`${informedViableOptions.length} INFORMED viable options`)

fs.writeFileSync('guesses.json', JSON.stringify(informedViableOptions, null, 2))

