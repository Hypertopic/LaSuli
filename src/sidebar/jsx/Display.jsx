/*global browser */
import React from 'react';
import Viewpoint from './Viewpoint.jsx';
import Topic from './Topic.jsx';

export default class Display extends React.Component {
  constructor(props) {
    super(props);
    this.state = {vp: null};
    browser.contextMenus.removeAll();
    this._deleteFrag=this._deleteFrag.bind(this);
    this._createFrag=this._createFrag.bind(this);
    this._renameTopic=this._renameTopic.bind(this);
    this._contextMenuListener=this._contextMenuListener.bind(this);
  }

	_contextMenuListener(info,tab) {
		if (info.menuItemId=="highlightnew" && this.state.vpId) {
			return this._createFrag(tab);
		}
	}

	componentDidMount() {
		browser.contextMenus.onClicked.addListener(this._contextMenuListener);
	}

	componentWillUnmount() {
		browser.contextMenus.onClicked.removeListener(this._contextMenuListener);
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

  _createFrag(tab,topic) {
    function addHL(vp,hl) {
      hl.text=[].concat(hl.text);
      hl.coordinates=[hl.coordinates];
      vp.topics[hl.topic] = vp.topics[hl.topic] || [];
      vp.topics[hl.topic].push(hl);
      return vp;
    }
    if (this.state.vpId) {
      return this.props.createFrag(tab,this.state.vpId,topic)
        .then( hl => {
          if (hl.topic) {
            this.setState(previousState => {
              addHL(previousState.vp,hl);
              return previousState;
            });
          }
          return hl;
        });
    }
  }

  _deleteFrag(topic,fragId) {
    function removeHL(vp) {
      vp.topics[topic]=vp.topics[topic].filter(hl => {return hl.id!=fragId});
      return vp;
    }
    if (this.state.vp && this.state.vpId) {
      return this.props.deleteFrag(this.state.vpId,topic,fragId).then( x => {
        this.setState(previousState => {
          removeHL(previousState.vp);
          return previousState;
        });
        return x;
      });
    }
  }

  _renameTopic(topic,newName) {
    let viewpoint=this.state.vpId;
    return browser.runtime.sendMessage({
      aim:'renameTopic',viewpoint,topic,newName
    }).then(x => {
      this.setState(previousState => {
        previousState.vp.topics[topic].name=newName;
        return previousState;
      });
    });
  }

	async _highlight(labels, fragments) {
		return this._loadScript().then(_ => browser.tabs.sendMessage(this.props.tabId, {
			aim: 'highlight',
			labels,
			fragments
		}))
		.then(() => {
			browser.runtime.sendMessage({
				aim:"setHLNumber",
				count:this.props.res.getFragments().length,
				tabId:this.props.tabId
			});
		});
	}

	async _loadScript() {
		let tabs = browser.tabs;
		return tabs.sendMessage(this.props.tabId, {aim: 'isLoaded'})
			.then(ret => {
				// the message system do not always throw an error
				// when the scripts are not loaded, so we do it ourselves
				// if we don't get the true result from isLoaded message
				if (!ret) {
					throw new Error("not loaded in "+tab.id);
				}
			})
			.catch(async () => {
				await tabs.executeScript(this.props.tabId, {
					file: '/dist/content.js'
				});
			});
	}

	_getViewpoints(labels) {
    let viewpoints = Object.keys(this.props.res.viewpoints);
    if (!viewpoints.length)
      return "Aucun";
    return viewpoints.map(id => {
      let vp = this.props.res.viewpoints[id];
      let vpDetails = this._vpDetails.bind(this, vp, id);
      return (
        <Viewpoint key={id} details={vp} onClick={vpDetails}
        color={labels[id].color} />
      );
    });
	}

	_createMenus(vp,vpid){
		if (!vp) return;
		browser.contextMenus.create({
			id: "highlightmenu",
			title: "Étiqueter comme...",
			contexts:["selection"]
		});

		browser.contextMenus.create({
			id: "highlightnew",
			title: "...",
			parentId: "highlightmenu",
			contexts:["selection"]
		});
	}

  _getTopics(labels) {
    return Object.keys(this.state.vp.topics).map((id,i) =>
      <Topic details={this.state.vp.topics[id]} id={id} index={i} vpId={this.state.vpId}
        color={labels[id].color} name={this.state.vp.topics[id].name}
        createFrag={this._createFrag} deleteFrag={this._deleteFrag}
        renameTopic={this._renameTopic} />
    );
  }

	_getButton() {
		let back = () => {
			this.setState({vp: null, vpId: null});
			browser.contextMenus.remove("highlightmenu");
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
