import React from 'react';
import Fragment from './Fragment.jsx';

class Topic extends React.Component {
	constructor(props) {
		super(props);
		this.state = {open: false};
		this._handleClick = this._handleClick.bind(this);
		this.createFragId="highlight-"+this.props.vpId+"-"+this.props.id;
		this._contextMenuListener=this._contextMenuListener.bind(this);
}

	_contextMenuListener(info,tab) {
		if (this.createFragId==info.menuItemId) {
			this.props.createFrag(tab,this.props.id);
		}
	}

	componentDidMount() {
		browser.contextMenus.create({
			id: this.createFragId,
			title: this.props.name || ("unknown "+(this.props.index+1)),
			parentId: "highlightmenu",
			contexts:["selection"]
		});
		browser.contextMenus.onClicked.addListener(this._contextMenuListener);
	}

	componentWillUnmount() {
		browser.contextMenus.remove(this.createFragId);
		browser.contextMenus.onClicked.removeListener(this._contextMenuListener);
	}

  render() {
    let fragments = this.props.details.map(hl => {
      let deleteFrag=() => {
        return this.props.deleteFrag(this.props.id,hl.id);
      }
      return <Fragment text={hl.text} id={hl.id} deleteFrag={deleteFrag}/>
    });
    let col = this.props.color;
    let style = {
      background: `rgb(${col.r}, ${col.g}, ${col.b})`
    };
    let name = this.props.name || ("unknown "+(this.props.index+1));
    let count = this.props.details.length;
    let onClick = this._handleClick;

    let nameControl;

    let setEdit = (e) => {
      e.stopPropagation();
      this.setState({edit:true});
    }

    if (this.state.edit) {

      let endEdit = () => {
        this.setState({edit:false});
      }

      let changeName = (newName) => {
        if (newName!=this.props.name) {
          this.props.renameTopic(this.props.id,newName).finally(endEdit);
        } else {
          endEdit();
        }
      }

      let onKeyPress = (e) => {
        if (e.key === 'Enter') {
          changeName(e.target.value);
        }
      }
      let onKeyUp = (e) => {
        if (e.key === 'Escape') {
          endEdit();
        }
      }

      let onBlur = (e) => {
        e.stopPropagation();
        return changeName(e.target.value);
      }
      let dontClose = (e) => e.stopPropagation();
      nameControl=<input onBlur={onBlur} onKeyPress={onKeyPress} onKeyUp={onKeyUp} onClick={dontClose} defaultValue={name}/>;
    } else {
      nameControl=<span onClick={setEdit}>{name}</span>;
    }
    return (<div>
      <h3 style={style} className="topic" onClick={onClick}>
        {nameControl} <small class="counter">{count}</small>
      </h3>
      {this.state.open && <div class="fragments">{fragments}</div>}
    </div>);
  }

	_handleClick() {
		this.setState({open: !this.state.open});
	}
}

export default Topic;
