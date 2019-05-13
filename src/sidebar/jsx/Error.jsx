import React from 'react';

import { Trans } from '@lingui/macro';

export default class Error extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		let file = this.props.err.fileName.split('/').pop();
		let msg = this.props.err.message;
		let github = 'https://github.com/Hypertopic/LaSuli/issues';
		return <div>
			<h1><Trans>Erreur</Trans></h1>
			<p>
				<Trans>
				Une erreur est survenue. Vous pouvez essayer de recharger
				la page, ou bien contacter le mainteneur de l'extension.
				</Trans>
			</p>
			<p><Trans>Résumé de l'erreur :</Trans></p>
			<pre>{file}: {msg}</pre>
			<p>
				<Trans>
				Le moyen recommandé de renseigner cette erreur est de créer
				un <a target="_blank" href={github}>nouveau ticket</a> sur
				l'entrepôt du projet LaSuli. Ces tickets sont publics.
				</Trans>
			</p>
			<p>
				<Trans>
				Il est conseillé d'y fournir autant d'informations que
				possible : adresse de la page, actions suivies ayant permis
				de découvrir l'erreur…
				</Trans>
			</p>
		</div>;
	}
}
