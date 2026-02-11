import React from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css'; 

const driverObj = driver({
  showProgress: true,
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
          // .. load element dynamically
          // .. and then call
          driverObj.moveNext();
        }
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
          // .. load element dynamically
          // .. and then call
          driverObj.moveNext();
        }
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
          // .. load element dynamically
          // .. and then call
          driverObj.moveNext();
        }
      },
    },
    {
      element: '#addMonsterOuter',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a monster',
        description: 'Type a creature name to look one up or just type a name for your monster. Then press enter or click the Add Monster button or enter a number and press Add Monsters to add more than 1. Like the Hero Manager, all stats can be adjusted below',
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
    if (currentStepIndex !== undefined && [0, 2].includes(currentStepIndex)) {
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
  driverObj.drive();
}