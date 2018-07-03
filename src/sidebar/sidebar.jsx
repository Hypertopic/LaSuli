/*global browser */
import React from 'react';
import ReactDOM from 'react-dom';

import Whitelist from './jsx/Whitelist.jsx';
import Display from './jsx/Display.jsx';

import Resource from '../backgroundScripts/Resource.js';

class Sidebar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			uri: '',
			status: 'waiting'
		};
	}

	componentDidMount() {
		// Listen to browser events for this window
		browser.windows.getCurrent({populate: true}).then((windowInfo) => {
			this.windowId = windowInfo.id;
			this._updateContent();
		});

		browser.tabs.onActivated.addListener(() => this._updateContent());
		browser.tabs.onUpdated.addListener((tab, changeInfo) => {
			if (changeInfo.status === 'complete') {
				this._updateContent();
			}
		});
	}

	render() {
		return <div>
			{this.getContent(this.state.status)}
		</div>;
	}

	getContent(status) {
		if (status === 'unknown') {
			// URI is unknown (not in the whitelist)
			return <Whitelist uri={this.state.uri} />;
		} else if (status === 'display') {
			// Show the highlights
			return <Display uri={this.state.uri} res={this.res} />;
		}
		return 'Waiting…'; // Waiting for the highlights
	}

	async _updateContent() {
		let tabs = await browser.tabs.query({
			windowId: this.windowId,
			active: true
		});
		let uri = tabs[0].url;
		let status;

		let isWhitelisted = await browser.runtime.sendMessage({
			aim: 'isWhitelisted',
			uri: uri
		});
		status = isWhitelisted ? 'waiting' : 'unknown';
		this.setState({uri, status});

		if (!isWhitelisted) {
			return;
		}

		let res = await browser.runtime.sendMessage({
			aim: 'getResource',
			uri: uri,
			reload: false
		});

		if (res && res.viewpoints) {
			status = 'display';
			this.res = new Resource(res);
			this.setState({uri, status});
		}
	}
}

const panel = document.getElementById('panel');
ReactDOM.render(<Sidebar />, panel);
