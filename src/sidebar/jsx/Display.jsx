/*global browser */
import React from 'react';
import Authenticated from './Authenticated.jsx';
import Viewpoint from './Viewpoint.jsx';
import Topic from './Topic.jsx';
import ViewpointModel from '../../backgroundScripts/Viewpoint.js'

import { Trans, t } from '@lingui/macro';
import { I18n } from "@lingui/react";
import { i18n } from "../sidebar.jsx"


export default class Display extends React.Component {

  constructor() {
    super();
    this.state = {
      selectedViewpoint: null,
      viewpointName: '',
      user: ''
    };
    browser.contextMenus.removeAll();
    this._deleteFrag = this._deleteFrag.bind(this);
    this._createFrag = this._createFrag.bind(this);
    this._moveFrag = this._moveFrag.bind(this);
    this._contextMenuListener = this._contextMenuListener.bind(this);
    this._handleBack = this._handleBack.bind(this);
    this._handleCreateViewpoint = this._handleCreateViewpoint.bind(this);
    this._handleViewpointName = this._handleViewpointName.bind(this);
    this._renameTopic = this._renameTopic.bind(this);
    this._loginListener = this._loginListener.bind(this);
  }

  _loginListener(user) {
    this.setState({user});
    this.props.update(this.props.tabId, true);
  }

	_contextMenuListener(info,tab) {
		if (info.menuItemId=="highlightnew" && this.state.selectedViewpoint) {
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
    let vp = this.state.selectedViewpoint;
    let coll = (vp || this.props.res);
    let labels = coll.getLabels();
    this._highlight(labels, coll.getFragments());
    if (vp && vp.topics) {
      let topics = this._getTopics(labels);
      return (
        <div>
          <Authenticated onLogin={this._loginListener} />
          <h1>{vp.name}</h1>
          <button className="btn btn-back" onClick={this._handleBack}>
            <Trans>Retour aux points de vue</Trans>
           </button>
          {topics}
        </div>
      );
    }
    let viewpoints = this._getViewpoints(labels);
    return (
      <div>
        <Authenticated onLogin={this._loginListener} />
        <h1><Trans>Points de vue</Trans></h1>
        {viewpoints}
        <form onChange={this._handleViewpointName} onSubmit={this._handleCreateViewpoint}>
          <I18n>
            {({ i18n }) => ( <input type="text" placeholder={i18n._(t`Nouveau point de vue`)} required /> )}
          </I18n>
          <I18n>
            {({ i18n }) => ( <input type="submit" value={i18n._(t`Créer`)} /> )}
          </I18n>
        </form>
      </div>
    );
  }

  _handleViewpointName(event) {
    this.setState({viewpointName: event.target.value});
  }

  _handleCreateViewpoint(event) {
    event.preventDefault();
    browser.runtime.sendMessage({
      aim:'createViewpoint',
      name: this.state.viewpointName
    })
      .then((v) => this._vpDetails(new ViewpointModel({
        _id: v._id,
        name: v.viewpoint_name,
        topics: {}
      })));
  }

  _createFrag(tab,topic) {
    function addHL(vp,hl) {
      hl.text=[].concat(hl.text);
      hl.coordinates=[hl.coordinates];
      vp.topics[hl.topic] = vp.topics[hl.topic] || [];
      vp.topics[hl.topic].push(hl);
      return vp;
    }
    let viewpoint = this.state.selectedViewpoint;
    if (viewpoint) {
      return this.props.createFrag(tab, viewpoint._id, topic)
        .then( hl => {
          if (hl.topic) {
            this.setState(previousState => {
              addHL(previousState.selectedViewpoint, hl);
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
    let viewpoint = this.state.selectedViewpoint;
    if (viewpoint) {
      return this.props.deleteFrag(viewpoint._id, topic, fragId).then( x => {
        this.setState(previousState => {
          removeHL(previousState.selectedViewpoint);
          return previousState;
        });
        return x;
      });
    }
  }

  _moveFrag(fragId,oldTopic,newTopic) {
    function moveHL(vp) {
      if (vp.topics[oldTopic] && vp.topics[newTopic]) {
        var theHl=vp.topics[oldTopic].find(hl => {return hl.id==fragId});
        if (theHl) {
          vp.topics[oldTopic]=vp.topics[oldTopic].filter(hl => {return hl.id!=fragId});
          vp.topics[newTopic].push(theHl);
        }
      }
      return vp;
    }
    let viewpoint = this.state.selectedViewpoint;
    if (viewpoint) {
      return this.props.moveFrag(viewpoint._id, fragId, newTopic).then( x => {
        this.setState(previousState => {
          moveHL(previousState.selectedViewpoint);
          return previousState;
        });
        return x;
      });
    }
  }

  _renameTopic(topic,newName) {
    let viewpoint = this.state.selectedViewpoint._id;
    return browser.runtime.sendMessage({
      aim:'renameTopic',viewpoint,topic,newName
    }).then(x => {
      this.setState(previousState => {
        previousState.selectedViewpoint.topics[topic].name = newName;
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
        return <Trans>Aucun</Trans>;
    return viewpoints.map(id => {
      let vp = this.props.res.viewpoints[id];
      vp._id = id;
      let vpDetails = this._vpDetails.bind(this, vp);
      return (
        <Viewpoint key={id} details={vp} onClick={vpDetails}
        color={labels[id].color} />
      );
    });
	}

	_createMenus(vp){
		if (!vp) return;
		browser.contextMenus.create({
			id: "highlightmenu",
			title: i18n._(t`Étiqueter comme...`),
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
    let viewpoint = this.state.selectedViewpoint;
    let topics = viewpoint.topics;
    return Object.keys(topics).map((id,i) =>
      <Topic details={topics[id]} id={id} index={i} vpId={viewpoint._id}
        color={labels[id].color} name={topics[id].name}
        createFrag={this._createFrag} deleteFrag={this._deleteFrag}
        moveFrag={this._moveFrag} renameTopic={this._renameTopic} />
    );
  }

  _handleBack() {
    this.props.update(this.props.tabId, true);
    this.setState({selectedViewpoint: null});
    browser.contextMenus.remove("highlightmenu");
  }

	_vpDetails(selectedViewpoint) {
		this._createMenus(selectedViewpoint);
		this.setState({selectedViewpoint});
	}

}
