/*global browser */
import React from 'react';
import Viewpoint from './Viewpoint.jsx';
import Topic from './Topic.jsx';

export default class Display extends React.Component {
	constructor(props) {
		super(props);
		this.state = {vp: null};
		browser.contextMenus.removeAll();
		this.deleteFrag=this.deleteFrag.bind(this);
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

	async deleteFrag(topic,fragId) {
		if (this.state.vp && this.state.vpId) {
			console.log("deleting",fragId,"from topic",topic,"of viewpoint",this.state.vpId);
			return this.props.deleteFrag(this.state.vpId,topic,fragId);
		}
	}

	async _highlight(labels, fragments) {
		return this._loadScript().then(_ => browser.tabs.sendMessage(this.props.tabId, {
			aim: 'highlight',
			labels,
			fragments
		}));
	}

	async _loadScript() {
		let tabs = browser.tabs;
		return tabs.sendMessage(this.props.tabId, {aim: 'isLoaded'})
			.then(_ => {
				// the message system do not always throw an console.error
				// when the scripts are not loaded, so we do it ourselves
				// if we don't get the true result from isLoaded message
				if (!_) {
					throw new Error("not loaded in "+tab.id)
				}
			})
			.catch(async () => {
				await tabs.executeScript(this.props.tabId, {
					file: '/dist/content.js'
				});
			});
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
			title: "Highlight as",
			contexts:["selection"]
		},() => {
			console.log("created menu");
		});

		/* as soon as new topic creation exists, can be enabled
		browser.contextMenus.create({
			id: "highlightnew",
			title: "...",
			parentId: "highlightmenu",
			contexts:["selection"]
		});
		*/

		console.log("topics");
		console.log(Object.keys(vp.topics).map(id=>vp.topics[id].name));

		Object.keys(vp.topics).map(id => {
			console.log("topic",id);
			browser.contextMenus.create({
				id: "highlight-"+vpid+"-"+id,
				title: vp.topics[id].name,
				parentId: "highlightmenu",
				contexts:["selection"]
			});
		});
	}

	_getTopics(labels) {
		return Object.keys(this.state.vp.topics).map(id =>
			<Topic details={this.state.vp.topics[id]} id={id} vpId={this.state.vpId}
				color={labels[id].color} deleteFrag={this.deleteFrag}/>
		);
	}

	_getButton() {
		let back = () => {
			this.setState({vp: null, vpId: null});
			browser.contextMenus.removeAll();
		}
		return <button class="btn btn-back" onClick={back}>
			Retour aux points de vue
		</button>;
	}

	_vpDetails(vp,id) {
		this._createMenus(vp,id);
		this.setState({vp, vpId:id});
	}
}
