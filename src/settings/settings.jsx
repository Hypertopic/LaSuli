import React from 'react';
import ReactDOM from 'react-dom';

class Settings extends React.Component {

  constructor() {
    super();
    this.state = {
        service: '',
        whitelist: []
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
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
          <p>Pages dans la liste blanche :</p>
            <ul>
                {this.state.whitelist.map((page) => <li> {page} </li>)}
            </ul>
        </div>
      </div>
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
    this.fetchSettings('services')
      .then((services) => {
        services[0] = this.state.service;
        browser.storage.local.set({services});
        this.notify("Success!", "Annotation service successfully added.")
      });
  }

    notify(title, message) {
        browser.notifications.create({
            type:"basic",
            title:title,
            message:message,
        });
    }
}

ReactDOM.render(
  <Settings />,
  document.getElementById('settings')
);
