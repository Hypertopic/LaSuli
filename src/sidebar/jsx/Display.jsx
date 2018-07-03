/*global browser */
import React from 'react';
import Viewpoint from './Viewpoint.jsx';

export default class Display extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		let title = 'Points de vue';
		let coll = this.props.res;
		let labels = coll.getLabels();
		let list = this._getViewpoints(labels);
		this._highlight(labels, coll.getFragments());
		return (<div>
			<h1>{title}</h1>
			{list}
		</div>);
	}

	async _highlight(labels, fragments) {
		let tab = await this._loadScript();
		await browser.tabs.sendMessage(tab.id, {
			aim: 'showHighlights',
			labels,
			fragments
		});
	}

	async _loadScript() {
		let tabs = browser.tabs;
		let tab = (await tabs.query({active: true}))[0];
		await tabs.sendMessage(tab.id, {aim: 'isLoaded'})
			.catch(async () => {
				await tabs.executeScript(tab.id, {
					file: '/dist/content.js'
				});
			});
		return tab;
	}

	_getViewpoints(labels) {
		return Object.keys(this.props.res.viewpoints).map(id => {
			let vp = this.props.res.viewpoints[id];
			return <Viewpoint key={id} details={vp}
				color={labels[id].color} />;
		});
	}
}
