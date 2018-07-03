import React from 'react';

class Topic extends React.Component {
	constructor(props) {
		super(props);
		this.state = {open: false};
		this._handleClick = this._handleClick.bind(this);
	}

	render() {
		let fragments = this.props.details.map(hl =>
			<div class="fragment">{String(hl.text)}</div>
		);
		let col = this.props.color;
		let style = {
			background: `rgb(${col.r}, ${col.g}, ${col.b})`
		};
		let name = this.props.details.name;
		let count = this.props.details.length;
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
