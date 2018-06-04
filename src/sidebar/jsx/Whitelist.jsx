import React from 'react';

class Whitelist extends React.Component {
	constructor(props) {
		super(props);
		this.uri = props.uri;
		this.viewpoints = props.vps;
	}

	render() {
		return (<div>
			<h1>Whitelist</h1>
			<p>The domain for this URI is not whitelisted:</p>
			<pre>{this.uri}</pre>
		</div>);
	}
}

export default Whitelist;
