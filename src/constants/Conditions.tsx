const predefinedConditions = [
    'Poisoned', 'Stunned', 'Prone', 'Restrained', 'Charmed', 
    'Frightened', 'Paralyzed', 'Unconscious', 'Blinded', 'Deafened',
    'Invisible', 'Incapacitated', 'Grappled', 'Exhausted 1', 'Exhausted 2', 
    'Exhausted 3', 'Exhausted 4', 'Exhausted 5', 'Exhausted 6', 'Ready', 'Concentrating', 'Death Saves'
  ];

const conditionDescriptions: Record<string, string> = {
  'Poisoned': 'You have Disadvantage on attack rolls and ability checks.',
  'Stunned': 'You have the Incapacitated condition. You automatically fail Strength and Dexterity saving throws. Attack rolls against you have Advantage.',
  'Prone': 'Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and thereby end the condition. If your Speed is 0, you can’t right yourself. You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage.',
  'Restrained': 'Your Speed is 0 and can\’t increase. Attack rolls against you have Advantage, and your attack rolls have Disadvantage. You have Disadvantage on Dexterity saving throws.',
  'Charmed': 'You can’t attack the charmer or target the charmer with damaging abilities or magical effects. The charmer has Advantage on any ability check to interact with you socially.',
  'Frightened': 'You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight. You can\’t willingly move closer to the source of fear.',
  'Paralyzed': 'You have the Incapacitated condition. Your Speed is 0 and can\’t increase. You automatically fail Strength and Dexterity saving throws. Attack rolls against you have Advantage. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.',
  'Unconscious': 'You have the Incapacitated and Prone conditions, and you drop whatever you\’re holding. When this condition ends, you remain Prone. Your Speed is 0 and can\’t increase. Attack rolls against you have Advantage. You automatically fail Strength and Dexterity saving throws. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you. You\’re unaware of your surroundings.',
  'Blinded': 'You can\’t see and automatically fail any ability check that requires sight. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.',
  'Deafened': 'You can\’t hear and automatically fail any ability check that requires hearing.',
  'Invisible': 'If you\’re Invisible when you roll Initiative, you have Advantage on the roll. You aren\’t affected by any effect that requires its target to be seen unless the effect\’s creator can somehow see you. Any equipment you are wearing or carrying is also concealed. Attack rolls against you have Disadvantage, and your attack rolls have Advantage. If a creature can somehow see you, you don\’t gain this benefit against that creature.',
  'Incapacitated': 'You can\’t take any action, Bonus Action, or Reaction. Your Concentration is broken. You can\’t speak. If you\’re Incapacitated when you roll Initiative, you have Disadvantage on the roll.',
  'Grappled': 'Your Speed is 0 and can\’t increase. You have Disadvantage on attack rolls against any target other than the grappler. The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it.',
  'Exhausted 1': 'Ability Checks, Attack Rolls, and Saving Throws are reduced by 2. Your Speed is reduced by 5.',
  'Exhausted 2': 'Ability Checks, Attack Rolls, and Saving Throws are reduced by 4. Your Speed is reduced by 10.',
  'Exhausted 3': 'Ability Checks, Attack Rolls, and Saving Throws are reduced by 6. Your Speed is reduced by 15.',
  'Exhausted 4': 'Ability Checks, Attack Rolls, and Saving Throws are reduced by 8. Your Speed is reduced by 20.',
  'Exhausted 5': 'Ability Checks, Attack Rolls, and Saving Throws are reduced by 10. Your Speed is reduced by 25.',
  'Exhausted 6': 'You are dead.',
  'Ready': 'This character has readied an action.',
  'Concentrating': 'This character is concentrating on a spell.',
  'Death Saves': 'This player is unconscious and is making death saving throws'
};

  export {predefinedConditions, conditionDescriptions}