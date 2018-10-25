/*global browser */
import React from 'react';
import ReactDOM from 'react-dom';

import Whitelist from './jsx/Whitelist.jsx';
import Display from './jsx/Display.jsx';
import Error from './jsx/Error.jsx';

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
		} else if (status === 'error') {
			return <Error err={this.state.error} uri={this.state.uri} />;
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
		}).catch((error) => {
			status = 'error';
			this.setState({uri, status, error});
		});

		if (res && res.viewpoints) {
			status = 'display';
			this.res = new Resource(res);
			this.setState({uri, status});
		}
	}
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
	console.log(info.menuItemId);
	console.log(info.selectionText);
	let coordinates = await browser.tabs.sendMessage(tab.id,{aim:"getCoordinates"});
	let matches=/highlight-(\w+)-(\w+)/.exec(info.menuItemId)
	if (matches) {
		let viewpoint=matches[1];
		let topic=matches[2];
		if (coordinates.text!=info.selectionText) {
			console.log("problem in getting text from webpage",coordinates.text,info.selectionText);
		}
		alert(`will create an highlight for ${coordinates.text} (${coordinates.startPos},${coordinates.endPos}) in topic ${topic} for viewpoint ${viewpoint}`);
	}
});

const panel = document.getElementById('panel');
ReactDOM.render(<Sidebar />, panel);
