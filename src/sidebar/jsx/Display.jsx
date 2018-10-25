/*global browser */
import React from 'react';
import Viewpoint from './Viewpoint.jsx';
import Topic from './Topic.jsx';

export default class Display extends React.Component {
	constructor(props) {
		super(props);
		this.state = {vp: null};
		browser.contextMenus.removeAll();
	}

	render() {
		let title, list;
		let vp = this.state.vp;
		let coll = (vp || this.props.res);
		let labels = coll.getLabels();

		if (vp && vp.topics) {
			title = vp.name;
			list = this._getTopics(labels);
		} else {
			title = 'Points de vue';
			list = this._getViewpoints(labels);
		}
		this._highlight(labels, coll.getFragments());
		return (<div>
			<h1>{title}</h1>
			{vp && vp.topics && this._getButton()}
			{list}
		</div>);
	}

	async _highlight(labels, fragments) {
		let tab = await this._loadScript();
		await browser.tabs.sendMessage(tab.id, {
			aim: 'highlight',
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
			let vpDetails = this._vpDetails.bind(this, vp, id);
			return <Viewpoint key={id} details={vp} onClick={vpDetails}
				color={labels[id].color} />;
		});
	}

	_createMenus(vp,vpid){
		if (!vp) return;
		console.log(vp);
		browser.contextMenus.create({
			id: "highlightmenu",
			title: "highlight %s in "+(vp.name || vpid),
			contexts:["selection"]
		},() => {
			console.log("created menu");
		});

		browser.contextMenus.create({
			id: "highlightnew",
			title: "...",
			parentId: "highlightmenu",
			contexts:["selection"]
		},() => {
			console.log("created menu");
		});

		console.log("topics");
		console.log(Object.keys(vp.topics).map(id=>vp.topics[id].name));

		Object.keys(vp.topics).map(id => {
			console.log("topic",id);
			browser.contextMenus.create({
				id: "highlight-"+vpid+"-"+id,
				title: vp.topics[id].name || id,
				parentId: "highlightmenu",
				contexts:["selection"]
			});
		});
	}

	_getTopics(labels) {
		return Object.keys(this.state.vp.topics).map(id =>
			<Topic details={this.state.vp.topics[id]} id={id}
				color={labels[id].color} />
		);
	}

	_getButton() {
		let back = () => {
			this.setState({vp: null});
			browser.contextMenus.removeAll();
		}
		return <button class="btn btn-back" onClick={back}>
			Retour aux points de vue
		</button>;
	}

	_vpDetails(vp,id) {
		console.log("View point");
		console.log(vp);
		this._createMenus(vp,id);
		this.setState({vp: vp});
	}
}
