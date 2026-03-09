import { describe, it, expect, vi } from 'vitest';
import { DEVMODE } from '../src/utils/devmode';

describe('devmode', () =>
{
    it('should export DEVMODE', () =>
    {
        // Just importing it ensures it evaluates without throwing errors
        // whether it is true or false
        expect(typeof DEVMODE).toBe('boolean');
    });
});
