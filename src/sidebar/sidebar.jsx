/*global browser */
import React from 'react';
import ReactDOM from 'react-dom';

import Whitelist from './jsx/Whitelist.jsx';
import Display from './jsx/Display.jsx';
import Error from './jsx/Error.jsx';

import Resource from '../backgroundScripts/Resource.js';

import { I18nProvider } from '@lingui/react';
import { setupI18n } from "@lingui/core"
import { Trans } from '@lingui/macro';
import catalogEn from '../locales/en/messages';
import catalogEt from '../locales/et/messages';
import catalogFr from "../locales/fr/messages";

const supportedLanguages = ["en", "fr", "et"];


class Sidebar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            uri: '',
            status: 'waiting'
        };
        this._deleteFrag = this._deleteFrag.bind(this);
        this._moveFrag = this._moveFrag.bind(this);
        this._createFrag = this._createFrag.bind(this);
        this._updateContent = this._updateContent.bind(this);
    }

    componentDidMount() {
        // Listen to browser events for this window
        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
            this.windowId = windowInfo.id;
            browser.tabs.query({
                windowId: this.windowId,
                active: true
            }).then(tabs => {
                let tab = tabs[0];
                this._updateContent(tab.id);
            });
        });

        browser.tabs.onActivated.addListener((tab) => this._updateContent(tab.tabId));
        browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (tabId == this.state.tabId && changeInfo.status === 'complete') {
                this._updateContent(tabId);
            }
        });
    }

    render() {
        return (
            <div>
                {this.getContent(this.state.status)}
            </div>
        );
    }

    getContent(status) {
        if (status === 'unknown') {
            // URI is unknown (not in the whitelist)
            return <Whitelist uri={this.state.uri} tabId={this.state.tabId}
                              update={this._updateContent}/>;
        } else if (status === 'display') {
            // Show the highlights
            return <Display uri={this.state.uri} res={this.res} tabId={this.state.tabId}
                            createFrag={this._createFrag} deleteFrag={this._deleteFrag} moveFrag={this._moveFrag}
                            update={this._updateContent}/>;
        } else if (status === 'error') {
            return <Error err={this.state.error} uri={this.state.uri}/>;
        }
        return <Trans>Chargement…</Trans>; // Waiting for the highlights
    }

    async _updateContent(tabId, reload) {

        let tab = await browser.tabs.get(tabId);
        if (!tab) return;
        let uri = tab.url;
        let status;

        let isWhitelisted = await browser.runtime.sendMessage({
            aim: 'isWhitelisted',
            uri: uri
        });
        status = isWhitelisted ? 'waiting' : 'unknown';

        this.setState({uri, status, tabId});

        if (!isWhitelisted) {
            return;
        }

        let res = await browser.runtime.sendMessage({
            aim: 'getResource',
            uri: uri,
            reload
        }).catch((error) => {
            status = 'error';
            this.setState({uri, status, error, tabId});
        });

        if (res && res.viewpoints) {
            status = 'display';
            this.res = new Resource(res);
            this.setState({uri, status, tabId});
        }
    }

    _deleteFrag(viewpoint, topic, fragId) {
        let uri = this.state.uri;
        return browser.runtime.sendMessage({
            aim: 'removeHighlight', uri, viewpoint, topic, fragId
        });
    }

    _moveFrag(viewpoint, fragId, newTopic) {
        let uri = this.state.uri;
        return browser.runtime.sendMessage({
            aim: 'moveHighlight', uri, newTopic, fragId
        });
    }

    _createFrag(tab, viewpoint, topic) {
        let uri = this.state.uri;
        return browser.tabs.sendMessage(tab.id, {aim: "getCoordinates"})
            .then(coordinates => {
                if (!coordinates) {
                    throw new Error("error getting coordinates");
                }
                return browser.runtime.sendMessage({
                    aim: 'createHighlight', uri, viewpoint, topic, coordinates
                });
            })
            .then(x => {
                browser.tabs.sendMessage(tab.id, {aim: "cleanSelection"});
                return x;
            });
    }

}

const fetchLanguage = function() {
    let uiLanguage = browser.i18n.getUILanguage().split("-")[0];
    return (supportedLanguages.includes(uiLanguage))? uiLanguage : 'en';
};

const catalogs = {
	  en: catalogEn,
	  et: catalogEt,
	  fr: catalogFr
	};

export const i18n = setupI18n({
    language: fetchLanguage(),
    catalogs: catalogs
  });

const panel = document.getElementById('panel');
const SidebarApp = () => (
    <I18nProvider i18n={i18n} language={fetchLanguage()} catalogs={catalogs}>
        <Sidebar />
    </I18nProvider>
);

ReactDOM.render(<SidebarApp />, panel);
