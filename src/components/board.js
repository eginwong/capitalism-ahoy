import React from 'react';
import Tile from './tile';
import './board.css';

class Board extends React.Component {
  constructor (props) {
    super(props);
    // TODO: Get properties
    const properties = Array(40).fill(null).map((_, i) => ({ position: i }));
    this.state = {
      spaces: properties
    };
  }
  render () {
    return (
      <div className="board">
          {
            this.state.spaces.map((v, i) => (<Tile key={ i } position={ v.position } />))
          }
          <div className="board__center"></div>
      </div>
    );
  }
}

export default Board;
