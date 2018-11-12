import React from 'react';
import Fragment from './Fragment.jsx';

class Topic extends React.Component {
	constructor(props) {
		super(props);
		this.state = {open: false};
		this.state.highlight = props.details;
		this._handleClick = this._handleClick.bind(this);
		this.createFragId="highlight-"+this.props.vpId+"-"+this.props.id;
		this._contextMenuListener=this._contextMenuListener.bind(this);
}

	_contextMenuListener(info,tab) {
		if (this.createFragId==info.menuItemId) {
			this.props.createFrag(tab,this.props.id).then(hl => {
				if (hl && hl.topic)
					this.setState({highlight:this.state.highlight.push(hl)});
			});
		}
	}

	componentDidMount() {
		browser.contextMenus.create({
			id: this.createFragId,
			title: this.props.name,
			parentId: "highlightmenu",
			contexts:["selection"]
		});
		browser.contextMenus.onClicked.addListener(this._contextMenuListener);
	}

	componentWillUnmount() {
		browser.contextMenus.remove(this.createFragId);
		browser.contextMenus.onClicked.removeListener(this._contextMenuListener);
	}

	render() {
		let fragments = this.state.highlight.map(hl => {
			let deleteFrag=() => {
				return this.props.deleteFrag(this.props.id,hl.id).then(_ => {
					this.setState(previousState => {
						return {highlight:previousState.highlight.filter(_ => {return _.id != hl.id})};
					})
				});
			}
			return <Fragment text={hl.text} id={hl.id} deleteFrag={deleteFrag}/>
		});
		let col = this.props.color;
		let style = {
			background: `rgb(${col.r}, ${col.g}, ${col.b})`
		};
		let name = this.state.highlight.name;
		let count = this.state.highlight.length;
		let onClick = this._handleClick;
		return (<div>
			<h3 style={style} className="topic" onClick={onClick}>
				{name} <small class="counter">{count}</small>
			</h3>
			{this.state.open && <div class="fragments">{fragments}</div>}
		</div>);
	}

	_handleClick() {
		this.setState({open: !this.state.open});
	}
}

export default Topic;
