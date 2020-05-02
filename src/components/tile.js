import React from 'react';
import './tile.css';

class Tile extends React.Component {
  constructor (props) {
    super(props);
    console.dir(props);
    // TODO: Get property object as prop
    this.state = {
      ...props
    };
  }
  render () {
    return (
      <div className="tile">
          { this.state.position }
      </div>
    );
  }
}

export default Tile;
