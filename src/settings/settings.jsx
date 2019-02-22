import React from 'react';
import ReactDOM from 'react-dom';

class Settings extends React.Component {

  constructor() {
    super();
    this.state = {
      service: ''
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
          <label>Service d'annotation (Hypertopic) :
            <input
              type="url"
              pattern="https?://.*/"
              placeholder="http://argos.local/"
              size="30"
              required
              value={this.state.service}
              onChange={this.handleChange}
            />
          </label>
          <button type="submit">Enregistrer</button>
      </form>
    );
  }

  fetchSettings(key) {
    return browser.storage.local.get(key)
      .then((x) => x[key] || []);
  }

  componentDidMount() {
    this.fetchSettings('services')
      .then((x) => this.setState({service: x[0]}));
  }

  handleChange(event) {
    this.setState({service: event.target.value})
  }

  handleSubmit(event) {
    event.preventDefault();
    this.fetchSettings('services')
      .then((services) => {
        services[0] = this.state.service;
        browser.storage.local.set({services});
      });
  }
}

ReactDOM.render(
  <Settings />,
  document.getElementById('settings')
);
