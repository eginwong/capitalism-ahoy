import React from 'react';
import Board from './components/board';
import './App.css';
import PlayerList from './components/PlayerList';


function App() {
  return (
    <div className="app">
      <PlayerList/>
      <Board />
    </div>
  );
}

export default App;
