import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css'; 
import { getCombatants } from '../utils/LocalStorage';

const combatants = getCombatants();

const driverObj = driver({
  showProgress: false,
//   overlayClickBehavior: "none",
  showButtons: ['next', 'previous'],
  steps: [
    {
      element: '#heroManagerButton',
      popover: {
        side: "right",
        align: 'center',
        title: 'Hero Manager',
        description: 'Start by opening the Hero Manager',
        onNextClick: () => {
          driverObj.moveTo(1);
        },
        disableButtons: ['next'],
      },
    },
    {
      element: '#addHeroOuter',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a hero',
        description: 'Type a name and any other attributes for your hero. Then press enter or click the Add Hero button to add your hero. All this can be changed or added to in the Hero Manager below.',
        onNextClick: () => {
          driverObj.moveTo(2);
        },
      },
    },
    {
      element: '#monsterManagerButton',
      popover: {
        side: "right",
        align: 'center',
        title: 'Monster Manager',
        description: 'Now open the Monster Manager',
        onNextClick: () => {
          driverObj.moveTo(3);
        },
        disableButtons: ['next'],
      },
    },
    {
      element: '#addMonsterOuter',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a monster',
        description: 'Type a creature name to look one up or just type a name for your monster. Then press enter or click the Add Monster button or enter a number and press Add Monsters to add more than 1.',
        onNextClick: () => {
          driverObj.moveTo(4);
        },
      },
    },
    {
      element: '#monsterManagerTable',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a monster',
        description: 'Adjust stats on any monsters that need it.\nMake sure to mark Ready for Next Battle any monsters you want to join the next battle.',
        onNextClick: () => {
          driverObj.moveTo(5);
        },
      },
    },
    {
      element: '#mmSaveCloseButton',
      popover: {
        side: "top",
        align: 'center',
        title: 'Return to Battle Tracker',
        description: 'Close the Monster Manager to return to the Battle Tracker.',
        onNextClick: () => {
          driverObj.moveTo(6);
        },
        disableButtons: ['next'],
      },
    },
    {
      element: '#buttonStartBattle',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Start your first battle',
        description: 'If everything is ready to go, press Start Battle.',
        onNextClick: () => {
          driverObj.moveTo(7);
        },
        disableButtons: ['next'],
      },
    },
    {
      element: '.popup-container',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Are you sure?',
        description: 'If you don\'t mind your current battle being deleted press Continue. Otherwise click outside the highlighted area and come back later.',
        onNextClick: () => {
          driverObj.moveTo(8);
        },
        disableButtons: ['next'],
      },
    },
    {
      element: '#initiativeDialogInner',
      popover: {
        side: "top",
        align: 'center',
        title: 'Roll for initative',
        description: 'Either enter the number rolled plus the intiative modifer or press Roll and it will do the rolling for you and add the initiative modifier set in the hero or monster manager. Do this for each combatant and then press next.',
        onNextClick: () => {
          driverObj.moveTo(9);
        }
      },
    },
    {
      element: '#battleTracker',
      popover: {
        side: "top",
        align: 'center',
        title: 'Run your battle',
        description: 'Checking action, bonus, and move for each combatant will advance the turn.',
        onNextClick: () => {
          driverObj.destroy();
        }
      },
    },
  ],

  onHighlighted: (element) => {
  const currentStepIndex = driverObj.getActiveIndex();
  
  if (currentStepIndex !== undefined) {
    // Check if we should skip step 6
    if (currentStepIndex === 6 && combatants.length === 0) {
      element?.addEventListener('click', () => {
        setTimeout(() => {
          driverObj.moveTo(8);
        }, 50);
      }, { once: true });
      return;
    }
    
    // For steps 0, 2, 5, AND 6 (when combatants.length > 0), move to next step
    if ([0, 2, 5, 6, 7].includes(currentStepIndex)) {
      element?.addEventListener('click', () => {
        setTimeout(() => {
          driverObj.moveNext();
        }, 50);
      }, { once: true });
    }
  }
}
});



// driverObj.setSteps(driver.steps)

// steps.forEach((step, index) => {
//     const element = document.querySelector(step.element)

//     if (element){element.addEventListener('click', () => driverObj.moveTo(index + 1))};
// })

export function startTour() {
  driverObj.drive(0);
}