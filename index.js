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
	fs.writeFileSync('data/processedWords2.json', JSON.stringify(processedWordPool))
}

function getBestGuess(
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
	const scoredOptions = viableOptions.map(viableOption => [viableOption, wordScores[viableOption]])
	scoredOptions.sort((a, b ) => (a[1].score <= b[1].score) ? 1 : -1)

	return scoredOptions
}

const encodedAnswers = JSON.parse(fs.readFileSync('data/encodedAnswers.json'));
const encodedWords = JSON.parse(fs.readFileSync('data/encodedWords.json'));
const processedWords = JSON.parse(fs.readFileSync('data/processedWords.json'));
const encodedWordPool = shuffle([
	...encodedAnswers,
	...encodedWords,
])

// preprocess(encodedWordPool);

guessPatterns = [
	'__x?_',
	'xxx__',
	'xxxx_',
	'xx_?_',
	'____x',
	'_xx_x',
	'_x__x',
	'_xx?x',
]

const viableOptions = getBestGuess(
	encodedAnswers,
	processedWords,
	guessPatterns,
)

console.log(`${viableOptions.length} viable options`)

fs.writeFileSync('guesses.json', JSON.stringify(viableOptions, null, 2))

