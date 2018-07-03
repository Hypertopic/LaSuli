import React from 'react';

export default class Error extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		let file = this.props.err.fileName.split('/').pop();
		let msg = this.props.err.message;
		let github = 'https://github.com/Hypertopic/LaSuli/issues';
		return <div>
			<h1>Erreur</h1>
			<p>
				Une erreur est survenue. Vous pouvez essayer de recharger
				la page, ou bien contacter le mainteneur de l'extension.
			</p>
			<p>Résumé de l'erreur :</p>
			<pre>{file}: {msg}</pre>
			<p>
				Le moyen recommandé de renseigner cette erreur est de créer
				un <a target="_blank" href={github}>nouveau ticket</a> sur
				l'entrepôt du projet LaSuli. Ces tickets sont publics.
			</p>
			<p>
				Il est conseillé d'y fournir autant d'informations que
				possible : adresse de la page, actions suivies ayant permis
				de découvrir l'erreur…
			</p>
		</div>;
	}
}
