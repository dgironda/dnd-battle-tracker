import { DEVMODE } from "../utils/devmode";

import React from 'react';
import { useGlobalContext } from '../hooks/versionContext';

const ToggleComponent: React.FC = () => {
  const { status, toggleStatus } = useGlobalContext();


  return (
       <button title='D&D 5e 2014 or 2024' id='buttonVersion' className='fourteen' onClick={toggleStatus}>
        D&D rules version: {status === 'twentyFourteen' ? '2014' : '2024'}
      </button>
  );
};

export default ToggleComponent;
