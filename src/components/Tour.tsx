import React from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css'; 

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
      },
    },
    {
      element: '#monsterManagerButton',
      popover: {
        side: "right",
        align: 'center',
        title: 'Monster Manager',
        description: 'Now open the Monster Manager',
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
      },
    },
    {
      element: '#monsterManagerTable',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a monster',
        description: 'Adjust stats on any monsters that need it.\nMake sure to mark Ready for Next Battle any monsters you want to join the next battle.',
      },
    },
    {
      element: '#mmSaveCloseButton',
      popover: {
        side: "top",
        align: 'center',
        title: 'Return to Battle Tracker',
        description: 'Close the Monster Manager to return to the Battle Tracker.',
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
        disableButtons: ['next'],
      },
    },
    {
      element: '#initiativeDialogInner',
      popover: {
        side: "top",
        align: 'center',
        title: 'Roll for initative',
        description: 'Either enter the number rolled plus the intiative modifer or press Roll and it will do the rolling for you and add the initiative modifier set in the hero or monster manager.',
        onNextClick: () => {
          // .. load element dynamically
          // .. and then call
          driverObj.moveNext();
        }
      },
    },
  ],
  onHighlighted: (element) => {
    const currentStepIndex = driverObj.getActiveIndex();
    if (currentStepIndex !== undefined && [0, 2, 5, 6].includes(currentStepIndex)) {
        element?.addEventListener('click', () => {
        setTimeout(() => {
            driverObj.moveNext();
        }, 50);
        }, { once: true });
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