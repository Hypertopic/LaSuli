import React from 'react';

import { Trans } from '@lingui/macro';

class Whitelist extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      whitelist: []
    };
  }

  render() {
    let handleClick = (x) => {this.addToWhitelist(this.props.uri)};
    return (
      <div>
        <h1><Trans>Site inconnu</Trans></h1>
        <p><Trans>Le domaine de cette page n'est pas dans la liste blanche :</Trans></p>
        <pre>{this._getDomain(this.props.uri)}</pre>
        <p><Trans>Voulez-vous l'ajouter ?</Trans></p>
        <p>
          <Trans>
          En ajoutant ce site à la liste blanche, vous autorisez l'application
          et les serveurs à suivre votre navigation sur ce site.
          </Trans>
        </p>
        <button onClick={handleClick}><Trans>Ajouter dans la liste blanche</Trans></button>
      </div>
    );
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
  }

  addToWhitelist(uri) {
    let page = this._getDomain(uri);
    if (this.state.whitelist.includes(page)) {
      this.notify("Error", "This page is already in the whitelist")
    } else {
      this.state.whitelist.push(page);
      browser.storage.local.set({
        whitelist: this.state.whitelist
      }).then(() => this.props.update(this.props.tabId));
    }
  }

  notify(title, message) {
    browser.notifications.create({
      type: "basic",
      title,
      message
    });
  }
}

export default Whitelist;
