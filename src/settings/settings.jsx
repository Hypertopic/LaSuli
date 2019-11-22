import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@lingui/react';
import { Trans } from '@lingui/macro';
import catalogEt from "../locales/et/messages";
import catalogEn from "../locales/en/messages";
import catalogFr from "../locales/fr/messages";

const supportedLanguages = ["en", "fr", "et"];

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
            <label><Trans>Service d'annotation (Hypertopic) :</Trans>
              <input
                pattern="https?://[^ ]+[^ /]"
                placeholder="http://argos.local"
                size="30"
                required
                value={this.state.service}
                onChange={this.handleChange}
              />
            </label>
            <button type="submit"><Trans>Enregistrer</Trans></button>
        </form>
        <div>
            <p><Trans>Domaines dans la liste blanche :</Trans></p>
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

const catalogs =
    { 	en: catalogEn,
        et: catalogEt,
        fr: catalogFr
    };

const fetchLanguage = function() {
    let uiLanguage = browser.i18n.getUILanguage().split("-")[0];
    return (supportedLanguages.includes(uiLanguage))? uiLanguage : 'en';
};

const SettingsApp = () => (
    <I18nProvider language={fetchLanguage()} catalogs={catalogs}>
        <Settings />
    </I18nProvider>
);

ReactDOM.render( <SettingsApp />, document.getElementById('settings'));
