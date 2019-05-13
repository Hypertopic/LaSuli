import React, { Component } from 'react';

import { Trans } from '@lingui/macro';
import { I18n } from "@lingui/react";
import { t } from "@lingui/macro";

class Authenticated extends Component {

  constructor() {
    super();
    this.state = {
      user: '',
      ask: false
    }
    this.handleAsk = this.handleAsk.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  render() {
    if (this.state.user) {
      return (
        <div className="Authenticated"> {this.state.user}
            <a href="#logout" onClick={this.handleLogout}><Trans>Se déconnecter</Trans></a>
        </div>
      );
    }
    if (this.state.ask) {
      return (
        <form className="Authenticated" onSubmit={this.handleLogin}>
          <I18n>
            {({ i18n }) => ( <input placeholder={i18n._(t`nom d'utilisateur`)} ref={(x) => this.login = x} /> )}
          </I18n>
          <I18n>
            {({ i18n }) => ( <input placeholder={i18n._(t`mot de passe`)} ref={(x) => this.password = x} type="password" /> )}
          </I18n>
          <I18n>
            {({ i18n }) => ( <input type="submit" value={i18n._(t`Se connecter`)} /> )}
          </I18n>
        </form>
      );
    }
    return (
      <div className="Authenticated">
          <a href="#login" onClick={this.handleAsk}><Trans>Se connecter...</Trans></a>
      </div>
    );
  }

  handleAsk(e) {
    e.preventDefault();
    this.setState({ask: true});
  }

  handleLogin(e) {
    e.preventDefault();
    this._openSession();
    this.setState({ask: false});
  }

  handleLogout(e) {
    e.preventDefault();
    this._closeSession();
  }

  _fetchSession() {
    browser.runtime.sendMessage({
      aim:'fetchSession'
    })
      .then((x) => this.setState({user: x.name || x.userCtx.name}))
      .catch(() => this.setState({user: ''}));
  }

  _openSession() {
    let user = this.login.value;
    browser.runtime.sendMessage({
      aim:'openSession',
      user,
      password: this.password.value
    })
      .then(() => {
        this.setState({user});
        this.props.onLogin({user});
      });
  }

  _closeSession() {
    browser.runtime.sendMessage({
      aim:'closeSession'
    })
      .then(() => {
        this.setState({user: ''});
        this.props.onLogin({user: ''});
      });
  }

  componentDidMount() {
    this._fetchSession();
    this._timer = setInterval(
      () => this._fetchSession(),
      60000
    );
  }

  componentWillUnmount() {
    clearInterval(this._timer);
  }
}

export default Authenticated;
