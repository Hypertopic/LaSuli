/*global require, __dirname */
const webpack = require('webpack');
const path = require('path');

module.exports = {
	// mode: 'production', // UglifyJS, remove errors, etc
	mode: 'none',
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('production')
		}),
	],
	entry: {
		settings: './src/settings/settings.jsx',
		background: './src/backgroundScripts/background.js',
		content: './src/contentScripts/content.js',
		sidebar: './src/sidebar/sidebar.jsx'
	},
	output: {
		path: path.resolve(__dirname, 'extension/dist'),
		filename: '[name].js',
	},
	module: {
		rules: [{
			// Transpile all JS(X) files (except node_modules) using Babel
			test: /\.jsx?$/,
			exclude: /node_modules/,
			loader: 'babel-loader',
			options: {
				presets: ['@babel/react']
			}
		}]
	},
	resolve: {
		// Allows importing modules as in a NodeJS app
		extensions: ['.js', '.jsx'],
	},
	// This will expose source map files so that errors will point to your
	// original source files instead of the transpiled files.
	devtool: 'sourcemap'
};
