/*global browser */
import React from 'react';
import ReactDOM from 'react-dom';
import Whitelist from './jsx/Whitelist.jsx';
import Display from './jsx/Display.jsx';

class Sidebar extends React.Component {
	constructor(props) {
		// Initiate the sidebar state
		super(props);
		this.state = {
			uri: '',
			status: 'waiting'
		};

		// Listen to browser events for this window
		let self = this;
		browser.windows.getCurrent({populate: true}).then((windowInfo) => {
			self.windowId = windowInfo.id;
			self._updateContent();
		});
		browser.tabs.onActivated.addListener(self._updateContent);
		browser.tabs.onUpdated.addListener(self._updateContent);
	}

	render() {
		let elem = 'Waiting…';
		switch (this.state.status) {
		case 'unknown': // Site is not on the whitelist
			elem = <Whitelist uri={this.state.uri} />;
			break;
		case 'display': // Manage the highlights
			elem = <Display uri={this.state.uri} vps={this.viewpoints} />;
			break;
		}
		
		return elem;
	}

	async _updateContent() {
		console.time('Time spent updating content');
		let tabs = await browser.tabs.query({
			windowId: this.windowId,
			active: true
		});
		let uri = tabs[0].url;
		console.log('updateContent!', uri);

		let isWhitelisted = await browser.runtime.sendMessage({
			aim: 'isWhitelisted',
			uri: uri
		});
		console.log('is whitelisted?', isWhitelisted);

		if (!isWhitelisted) {
			this.setState({
				uri: uri,
				status: 'unknown'
			});
			console.timeEnd('Time spent updating content');
			return;
		}

		this.setState({
			uri: uri,
			status: 'waiting'
		});
		let res = await browser.runtime.sendMessage({
			aim: 'getResource',
			uri: uri,
			reload: false
		});
		console.log('Got it:', res);
		this.viewpoints = res.viewpoints;
		this.setState({
			uri: uri,
			status: 'display'
		});
		console.timeEnd('Time spent updating content');
	}
}

const panel = document.getElementById('panel');
ReactDOM.render(<Sidebar />, panel);

