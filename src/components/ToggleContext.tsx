import { DEVMODE } from "../utils/devmode";

import React from 'react';
import { useGlobalContext } from '../hooks/optionsContext';

const ToggleComponent: React.FC = () => {
  const { settings, toggleVersion } = useGlobalContext();


  return (
       <><h2>D&D 5e version</h2><button title='D&D 5e 2014 or 2024' id='buttonVersion' className={settings.version === 'twentyFourteen' ? 'fourteen' : 'twentyFour'} onClick={toggleVersion}>
        <span>&nbsp;</span>
        {/* D&D rules version: {settings.version === 'twentyFourteen' ? '2014' : '2024'} */}
       </button>
      </>
  );
};

export default ToggleComponent;
