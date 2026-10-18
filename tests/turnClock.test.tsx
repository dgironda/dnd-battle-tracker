/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { GlobalProvider } from '../src/hooks/optionsContext';
import RoundNumberSpan from '../src/components/BattleTracker/RoundNumber';

/**
 * The turn clock rewrites its text every second. Session replay uploads within
 * two seconds of anything it records, so a recorded clock kept it uploading
 * through the relay for as long as a fight ran. ph-no-capture is posthog-js's
 * own class for leaving an element out of recordings.
 */
describe('the turn clock', () => {
  it('stays out of session replay', () => {
    const timerRef = createRef<HTMLSpanElement>();
    render(
      <GlobalProvider>
        <RoundNumberSpan roundNumber={1} timerRef={timerRef} />
      </GlobalProvider>,
    );

    expect(timerRef.current?.textContent).toBe('Advance the turn to start the timer');
    expect(timerRef.current?.classList.contains('ph-no-capture')).toBe(true);
  });
});
