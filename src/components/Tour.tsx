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
      element: '#addHeroInner',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a hero',
        description: 'Type a name and any other attributes for your hero. All this can be changed or added to later.',
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