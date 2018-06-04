import React from 'react';

class Viewpoint extends React.Component {
	constructor(props) {
		super(props);
		console.log('Constructing viewpoint from:', props.details);
		this.id = props.details.id;
		this.user = String((props.details.user || [])[0]);
		this.name = String((props.details.name || [])[0]);
	}

	render() {
		return (<div>
			<h2 title={this.id}>{this.name}</h2>
		</div>);
	}
}

export default Viewpoint;
