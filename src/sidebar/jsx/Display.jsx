import React from 'react';
import Viewpoint from './Viewpoint.jsx';

class Display extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		let title = 'Points de vue';
		let labels = this.props.res.getLabels();
		let list = this._getViewpoints(labels);
		return (<div>
			<h1>{title}</h1>
			{list}
		</div>);
	}

	_getViewpoints(labels) {
		return Object.keys(this.props.res.viewpoints).map(id => {
			let vp = this.props.res.viewpoints[id];
			return <Viewpoint key={id} details={vp}
				color={labels[id].color} />;
		});
	}
}

export default Display;
