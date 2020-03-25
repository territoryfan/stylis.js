import {MS, MOZ, WEBKIT, RULESET, KEYFRAMES, DECLARATION} from './Enum.js'
import {match, charat, substr, strlen, sizeof, assign, replace, combine} from './Utility.js'
import {tokenize} from './Tokenizer.js'
import {serialize} from './Serializer.js'
import {prefix} from './Prefixer.js'

/**
 * @param {function[]} collection
 * @return {function}
 */
export function middleware (collection) {
	var length = sizeof(collection)

	return function (element, index, children, callback) {
		var output = ''

		for (var i = 0; i < length; i++)
			output += collection[i](element, index, children, callback) || ''

		return output
	}
}

/**
 * @param {function} callback
 * @return {function}
 */
export function rulesheet (callback) {
	return function (element) {
		if (!element.root)
			if (element = element.return)
				callback(element)
	}
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 * @param {function} callback
 */
export function prefixer (element, index, children, callback) {
	switch (element.type) {
		case DECLARATION: element.return = prefix(element.value, element.length)
			break
		case KEYFRAMES:
			return serialize([assign({}, element, {type: '', value: replace(element.value, '@', '@' + WEBKIT)})], callback)
		case RULESET:
			if (element.length)
				return combine(element.props, function (value) {
					switch (match(value, /(::place.+|:read-.+)/)) {
						// :read-(only|write)
						case ':read-only': case ':read-write':
							return serialize([assign({}, element, {type: '', value: replace(value, /(read.+)/, MOZ + '$1')})], callback)
						// :placeholder
						case '::placeholder':
							return serialize([assign({}, element, {type: '', value: replace(value, /(place.+)/, WEBKIT + 'input-$1')}),
								assign({}, element, {type: '', value: replace(value, /(place.+)/, MOZ + '$1')}),
								assign({}, element, {type: '', value: replace(value, /:(place.+)/, MS + 'input-$1')})], callback)
					}

					return ''
				})
	}
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 */
export function namespace (element) {
	switch (element.type) {
		case RULESET:
			element.props = element.props.map(function (value) {
				return combine(tokenize(value), function (value, index, children) {
					switch (charat(value, 0)) {
						// \f
						case 12:
							return substr(value, 1, strlen(value))
						// \0 ( + > ~
						case 0: case 40: case 43: case 62: case 126:
							return value
						// :
						case 58:
							if (children[index + 1] === 'global')
								children[index + 1] = '', children[index + 2] = '\f' + substr(children[index + 2], index = 1, -1)
						// \s
						case 32:
							return index === 1 ? '' : value
						default:
							switch (index) {
								case 0: element = value
									return sizeof(children) > 1 ? '' : value
								case index = sizeof(children) - 1: case 2:
									return index === 2 ? value + element + element : value + element
								default:
									return value
							}
					}
				})
			})
	}
}