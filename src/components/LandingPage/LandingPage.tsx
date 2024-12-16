import React, { useState } from 'react';
import AvatarPreview from '../Preview/Preview';  
import logoText from '../images/logotext.png'; 
import './LandingPage.css';

import Collections from '../Colletions/Colletions';  
import Explore from '../Explore/Explore';         

const LandingPage = () => {
  const [showAvatar, setShowAvatar] = useState(false);

  const handleClick = () => {
    setShowAvatar(true);
  };

  return (
    <div>
      {!showAvatar ? (
        <div className="container">
          <img src={logoText} alt="Drip Wear Logo" className="logo-image" />
          <p className="paragraph lexend-deca">Check out our new collection!</p>

          {/* Container para os três botões */}
          <div className="button-container">
            <button className="button lexend-deca" onClick={handleClick}>Connect Wallet</button>
            <button className="button lexend-deca">Collections</button>
            <button className="button lexend-deca">Explore</button>
          </div>
        </div>
      ) : (
        <AvatarPreview />
      )}
    </div>
  );
};

export default LandingPage;

