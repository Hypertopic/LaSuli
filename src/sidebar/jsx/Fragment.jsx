import React from 'react';

class Fragment extends React.Component {
	constructor(props) {
		super(props);
    this._delete=this._delete.bind(this);
	}

  async _delete() {
    alert("will delete ",this.props.id);
  }

	render() {
    let deleteFrag=this._delete;
    return (<div class="fragment">{String(this.props.text)} ({this.props.id})<span onClick={deleteFrag}>x</span></div>);
  }

}

export default Fragment;
