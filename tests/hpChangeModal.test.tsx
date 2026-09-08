/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HpChangeModal } from '../src/utils/dmg-heal';
import type { Combatant } from '../src/types/index';

vi.mock('../src/hooks/optionsContext', () => ({
  useGlobalContext: () => ({
    settings: {
      version: 'twentyFourteen' as const,
      theme: 'light' as const,
      conditionReminderOn: true,
      currentTurnTime: true,
      tourReady: false,
    },
    updateSetting: vi.fn(),
    toggleVersion: vi.fn(),
  }),
}));

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'c1',
    name: 'Test Fighter',
    link: '',
    type: 'monster',
    currHp: 10,
    maxHp: 10,
    tHp: 0,
    initiative: 5,
    init: 2,
    action: false,
    bonus: false,
    move: false,
    reaction: false,
    conditions: [],
    deathsaves: [],
    ac: 14,
    str: 10,
    dex: 12,
    con: 14,
    int: 8,
    wis: 10,
    cha: 10,
    pp: 12,
    ...overrides,
  };
}

function defaultCallbacks() {
  return {
    onSubmit: vi.fn(),
    onUpdateBoth: vi.fn(),
    onUpdateDeathSaves: vi.fn(),
    onClose: vi.fn(),
    updateCombatant: vi.fn(),
  };
}

function renderModal(overrides: {
  combatant?: Combatant;
  currentHp?: number;
  maxHp?: number;
  tHp?: number;
  conditions?: string[];
  type?: 'hero' | 'monster';
  deathsaves?: boolean[];
} = {}) {
  const combatant = overrides.combatant ?? makeCombatant();
  const cbs = defaultCallbacks();
  render(
    <HpChangeModal
      combatant={combatant}
      combatantName={combatant.name}
      currentHp={overrides.currentHp ?? combatant.currHp}
      maxHp={overrides.maxHp ?? combatant.maxHp}
      tHp={overrides.tHp ?? combatant.tHp}
      conditions={overrides.conditions ?? combatant.conditions}
      type={overrides.type ?? combatant.type}
      deathsaves={overrides.deathsaves ?? combatant.deathsaves}
      {...cbs}
    />
  );
  return cbs;
}

describe('HpChangeModal', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders combatant name and current HP', () => {
    renderModal({ combatant: makeCombatant({ name: 'Goblin', currHp: 7, maxHp: 12 }) });
    expect(screen.getByRole('heading', { level: 3, name: 'Goblin' })).toBeInTheDocument();
    // The readout is a labelled figure now rather than the sentence
    // "Current HP: 7 / 12", so the label and the number are asserted apart.
    expect(screen.getByText('Current HP')).toBeInTheDocument();
    expect(document.querySelector('.hpReadout .hpStatValue')?.textContent).toBe('7/12');
  });

  it('shows error when Take Damage is used with empty amount', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Take Damage' }));
    expect(screen.getByText('Enter an amount.')).toBeInTheDocument();
  });

  it('applies damage and closes when amount is valid (no concentration)', () => {
    const cbs = renderModal({
      combatant: makeCombatant({ conditions: [] }),
      currentHp: 10,
      tHp: 0,
      type: 'monster',
    });
    fireEvent.change(screen.getByPlaceholderText('Enter amount'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Take Damage' }));
    expect(cbs.onSubmit).toHaveBeenCalledWith(7, 0);
    expect(cbs.onClose).toHaveBeenCalled();
  });

  it('shows error when Heal is used with empty amount', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Heal' }));
    expect(screen.getByText('Enter an amount.')).toBeInTheDocument();
  });

  it('shows error when Heal amount is negative', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Enter amount'), { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Heal' }));
    expect(screen.getByText('Healing must be positive.')).toBeInTheDocument();
  });

  it('applies healing capped at max HP', () => {
    const cbs = renderModal({ currentHp: 8, maxHp: 10, tHp: 0 });
    fireEvent.change(screen.getByPlaceholderText('Enter amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Heal' }));
    expect(cbs.onSubmit).toHaveBeenCalledWith(10, 0);
    expect(cbs.onClose).toHaveBeenCalled();
  });

  it('shows Death Saving Throws section when dying', () => {
    renderModal({
      conditions: ['Death Saves'],
      currentHp: 0,
      deathsaves: [],
    });
    expect(screen.getByRole('heading', { name: 'Death Saving Throws' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Success' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Failure' })).toBeInTheDocument();
  });

  it('records a death save success via Success button', () => {
    const cbs = renderModal({
      conditions: ['Death Saves'],
      currentHp: 0,
      deathsaves: [],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(cbs.onUpdateDeathSaves).toHaveBeenCalledWith([true]);
  });
});
