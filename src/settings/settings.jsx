import React from 'react';
import ReactDOM from 'react-dom';

class Settings extends React.Component {

  constructor() {
    super();
    this.state = {
      whitelist: [],
      service: ''
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
    let domains = this.getDomains();
    return (
      <div>
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
        <div>
          <p>Domaines dans la liste blanche :</p>
          <ul>
            {domains}
          </ul>
        </div>
      </div>
    );
  }

  getDomains() {
    return this.state.whitelist.map((page) => 
      <li> {page} </li>
    );
  }

  fetchSettings(key) {
    return browser.storage.local.get(key)
      .then((x) => x[key] || []);
  }

  componentDidMount() {
    this.fetchSettings('services')
      .then((x) => this.setState({service: x[0]}));
    this.fetchSettings('whitelist')
      .then((x) => this.setState({whitelist: x}));
  }

  handleChange(event) {
    this.setState({service: event.target.value})
  }

  handleSubmit(event) {
    event.preventDefault();
    fetch(this.state.service)
      .then((x) => {
        if (!x.ok) throw new Error(x.statusText);
        return x.json()
          .catch(_ => ({}));
      })
      .then((x) => {
        if (!x.service) throw new Error('This service is not Hypertopic compliant');
        return x.service;
      })
      .then((x) => this.notify('Success!', `${x} service detected!`))
      .then(() => this.fetchSettings('services'))
      .then((services) => {
        services[0] = this.state.service;
        browser.storage.local.set({services});
      })
      .catch((e) => this.notify('Error!', e.message));
  }

  notify(title, message) {
    return browser.notifications.create({
      type: "basic",
      title,
      message,
    });
  }
}

ReactDOM.render(
  <Settings />,
  document.getElementById('settings')
);
