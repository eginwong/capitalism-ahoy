import React from 'react';
import './board.css';

class Board extends React.Component {
  constructor (props) {
    super(props);
    // TODO: Get properties
    const properties = Array(40).fill(null).map((_, i) => i);
    this.state = {
      spaces: properties
    }
  }
  render () {
    return (
      <div className="board">
          {
            this.state.spaces.map((v) => (<p key={ v }>{ v }</p>))
          }
          <div className="center"></div>
      </div>
    );
  }
}

export default Board;
