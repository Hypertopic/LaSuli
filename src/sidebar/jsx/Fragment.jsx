import React from 'react';

class Fragment extends React.Component {
  constructor(props) {
    super(props);
    this.state={};
  }

  onDrag(e) {
    this.props.draggedFrag(this.props.id);
    e.dataTransfer.setData("dragContent",JSON.stringify(this.props));
    this.setState({isDragged:true});
    e.stopPropagation();
  }

  onDragStop(e) {
    this.props.draggedFrag(false);
    this.setState({isDragged:false});
    e.stopPropagation();
  }

  render() {
    var classes="fragment";
    if(this.state.isDragged) classes+=" dragged";
    return (<div className={classes} draggable onDragStart={this.onDrag.bind(this)} onDragEnd={this.onDragStop.bind(this)}>{String(this.props.text)}{}
      <span className="delete" onClick={this.props.deleteFrag}>x</span>
    </div>);
  }

}

export default Fragment;
