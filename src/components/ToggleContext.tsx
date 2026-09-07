import React from 'react';
import { useGlobalContext } from '../hooks/optionsContext';

/**
 * The rules-version switch: 2014 on the left, 2024 on the right.
 *
 * Two buttons in a radiogroup rather than one button that flips, because that
 * is what it is — a choice between two, where the selected one is visibly on
 * and the other visibly off. Each has its own drawn art for off / on / hover /
 * pressed. Clicking the one already chosen does nothing.
 */
const ToggleComponent: React.FC = () => {
  const { settings, toggleVersion } = useGlobalContext();
  const isTwentyFourteen = settings.version === 'twentyFourteen';

  return (
    <>
      <h2>D&amp;D 5e version</h2>
      <div className="versionToggle" role="radiogroup" aria-label="D&D 5e rules version">
        <button
          type="button"
          role="radio"
          aria-checked={isTwentyFourteen}
          className="versionOption versionOption2014"
          title="Use the 2014 rules"
          onClick={() => { if (!isTwentyFourteen) toggleVersion(); }}
        >
          <span className="visuallyHidden">2014 rules</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!isTwentyFourteen}
          className="versionOption versionOption2024"
          title="Use the 2024 rules"
          onClick={() => { if (isTwentyFourteen) toggleVersion(); }}
        >
          <span className="visuallyHidden">2024 rules</span>
        </button>
      </div>
    </>
  );
};

export default ToggleComponent;
