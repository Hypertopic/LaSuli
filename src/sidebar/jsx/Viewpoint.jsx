import React from 'react';

class Viewpoint extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		let vp = this.props.details;
		let col = this.props.color;
		let style = {
			background: `rgb(${col.r}, ${col.g}, ${col.b})`
		};
		return (<div>
			<h2 style={style} className="viewpoint">
				{vp.name} <small class="counter">{vp.getHLCount()}</small>
			</h2>
		</div>);
	}
}

export default Viewpoint;
