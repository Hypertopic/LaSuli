import React, { Component } from 'react';

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
          <a href="#logout" onClick={this.handleLogout}>Se déconnecter</a>
        </div>
      );
    }
    if (this.state.ask) {
      return (
        <form className="Authenticated" onSubmit={this.handleLogin}>
          <input placeholder="nom d'utilisateur" ref={(x) => this.login = x} />
          <input placeholder="mot de passe" ref={(x) => this.password = x} type="password" />
          <input type="submit" value="Se connecter" />
        </form>
      );
    }
    return (
      <div className="Authenticated">
        <a href="#login" onClick={this.handleAsk}>Se connecter...</a>
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
        this.setState({user})
      });
  }

  _closeSession() {
    browser.runtime.sendMessage({
      aim:'closeSession'
    })
      .then(() => this.setState({user: ''}));
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
