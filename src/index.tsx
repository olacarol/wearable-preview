import React from 'react';
import ReactDOM from 'react-dom';
import LandingPage from '../src/components/LandingPage/LandingPage'; // Importa a LandingPage
import '../src/assets/styles/global.css';

ReactDOM.render(
  <React.StrictMode>
    <LandingPage /> {/* Renderiza a LandingPage no lugar do Preview */}
  </React.StrictMode>,
  document.getElementById('root')
);


