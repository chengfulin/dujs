/*
 * ESLint flat config, ported from the former .jshintrc files:
 *   nonew -> no-new, curly -> curly, noarg -> no-caller, forin -> guard-for-in,
 *   noempty -> no-empty, eqeqeq -> eqeqeq, strict -> strict (function),
 *   undef -> no-undef, bitwise -> no-bitwise, unused -> no-unused-vars,
 *   maxdepth: 3 (lib only) -> max-depth, node/mocha -> globals
 */
var globals = require('globals');

var baseRules = {
	'no-new': 'error',
	'curly': 'error',
	'no-caller': 'error',
	'guard-for-in': 'error',
	'no-empty': 'error',
	'eqeqeq': 'error',
	'strict': ['error', 'function'],
	'no-undef': 'error',
	'no-bitwise': 'error',
	'no-unused-vars': 'error'
};

module.exports = [
	{
		ignores: [
			'node_modules/**',
			'coverage/**',
			'doc/**',
			'out-*/**',
			// esgraph fixtures: intentionally undefined identifiers as CFG input
			'tests/esgraph/tests/**',
			// golden fixtures: browser scripts analyzed as input, not run by Node
			'tests/golden/fixtures/**'
		]
	},
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'commonjs',
			globals: Object.assign({}, globals.node)
		},
		rules: baseRules
	},
	{
		files: ['lib/**/*.js'],
		rules: {
			'max-depth': ['error', 3]
		}
	},
	{
		files: ['tests/**/*.js'],
		languageOptions: {
			globals: Object.assign({}, globals.node, globals.mocha)
		}
	}
];
