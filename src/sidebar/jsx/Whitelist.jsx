import React from 'react';

class Whitelist extends React.Component {
	constructor(props) {
		super(props);
        this.state = {
            whitelist: []
        };
	}

	render() {
		return (<div>
			<h1>Site inconnu</h1>
			<p>Le domaine de cette page n'est pas dans la liste blanche :</p>
			<pre>{this._getDomain(this.props.uri)}</pre>
            <p>Voulez-vous l'ajouter?</p>
            <p>En ajoutant ce site à la liste blanche, vous autorisez l'application et les serveurs à suivre votre navigation sur ce site.</p>
            <button onClick={() => this.addToWhitelist(this.props.uri)}>Ajouter dans la liste blanche</button>

		</div>);
	}

	_getDomain(uri) {
		return new URL(uri).hostname || uri;
	}

    fetchSettings(key) {
        return browser.storage.local.get(key)
            .then((x) => x[key] || []);
    }

    componentDidMount() {
        this.fetchSettings('whitelist')
            .then((x) => this.setState({whitelist: x}));
        console.log(this.state.whitelist);
    }

	addToWhitelist(uri) {
		let page = this._getDomain(uri);
		if (this.state.whitelist.includes(page)) {
			this.notify("Error", "This page is already in the whitelist")
        } else {
            this.state.whitelist.push(page);
            browser.storage.local.set({
                whitelist: this.state.whitelist
            });
            this.notify("Success!", "Page successfully added to the whitelist");
        }
    }

    notify(title, message) {
        browser.notifications.create({
            type:"basic",
            title:title,
            message:message,
        });
	}
}

export default Whitelist;
