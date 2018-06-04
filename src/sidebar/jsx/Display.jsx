import React from 'react';
import Viewpoint from './Viewpoint.jsx';

class Display extends React.Component {
	constructor(props) {
		super(props);
		this.uri = props.uri;
		this.viewpoints = props.vps;
	}

	render() {
		let viewpoints = this._getViewpoints();
		return (<div>
			<h1>Viewpoints</h1>
			<div className="viewpoints">
				{viewpoints}
			</div>
		</div>);
	}

	_getViewpoints() {
		return this.viewpoints.map(vp =>
			<Viewpoint key={vp.id} details={vp} />
		);
	}
}

export default Display;
