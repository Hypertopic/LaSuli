import React from 'react';

class Fragment extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
    return (<div class="fragment">{String(this.props.text)} ({this.props.id})
      <span onClick={this.props.deleteFrag}>x</span>
    </div>);
  }

}

export default Fragment;
