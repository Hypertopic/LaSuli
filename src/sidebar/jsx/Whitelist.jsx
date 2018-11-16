import React from 'react';

class Whitelist extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (<div>
			<h1>Site inconnu</h1>
			<p>Le domaine de cette page n'est pas dans la liste blanche :</p>
			<pre>{this._getDomain(this.props.uri)}</pre>
		</div>);
	}

	_getDomain(uri) {
		return new URL(uri).hostname || uri;
	}
}

export default Whitelist;
