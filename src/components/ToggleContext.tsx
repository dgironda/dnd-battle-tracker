import React from 'react';
import { useGlobalContext } from '../hooks/versionContext';

const ToggleComponent: React.FC = () => {
  const { status, toggleStatus } = useGlobalContext();

  return (
       <button id='' onClick={toggleStatus}>
        D&D rules version: {status === 'twentyFourteen' ? '2014' : '2024'}
      </button>
  );
};

export default ToggleComponent;
