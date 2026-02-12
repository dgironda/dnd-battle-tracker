import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css'; 
import { getCombatants } from '../utils/LocalStorage';
import { useGlobalContext } from '../hooks/optionsContext';

let driverObj: any = null

export function Tour() {

    const combatants = getCombatants();
const { updateSetting } = useGlobalContext();

useEffect(() => {
 driverObj = driver({
  showProgress: true,
//   overlayClickBehavior: "none",
  showButtons: ['next', 'previous'],
  allowClose: false,
  stagePadding: 10,
  stageRadius: 10,
  onCloseClick: () => {
      driverObj.destroy()
    },
  steps: [
    {
      element: '#heroManagerButton',
      popover: {
        side: "right",
        align: 'center',
        title: 'Hero Manager',
        description: 'Start by clicking here to open the Hero Manager',
        onNextClick: () => {
          driverObj.moveTo(1);
        },
        showButtons: ['close'],
      },
    },
    {
      element: '#addHeroOuter',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a hero',
        description: 'Type a name and any other attributes for your hero. <br/>Then press enter or click the Add Hero button to add your hero. <br/>All this can be changed or added to in the Hero Manager below.',
        onNextClick: () => {
          driverObj.moveTo(2);
        },
        onPrevClick: () => {
            const element = document.getElementById("heroManagerButton");
            if (element instanceof HTMLButtonElement) {
                element.click()}
          driverObj.moveTo(0);
        },
        showButtons: ['previous', 'next', 'close'],
      },
    },
    {
      element: '#monsterManagerButton',
      popover: {
        side: "right",
        align: 'center',
        title: 'Monster Manager',
        description: 'Now click here to open the Monster Manager. The Hero Manager will automatically close.',
        onNextClick: () => {
          driverObj.moveTo(3);
        },
        onPrevClick: () => {
          driverObj.moveTo(1);
        },
        showButtons: ['previous', 'close'],
      },
    },
    {
      element: '#addMonsterOuter',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Add a monster',
        description: 'Type a creature name to look one up or just type a name for your monster. <br/>Then press enter or click the Add Monster button or enter a number and press Add Monsters to add more than 1.',
        onNextClick: () => {
          driverObj.moveTo(4);
        },
        onPrevClick: () => {
            const element = document.getElementById("heroManagerButton");
            if (element instanceof HTMLButtonElement) {
                element.click()}
          driverObj.moveTo(2);
        },
        showButtons: ['previous', 'next', 'close'],
      },
    },
    {
      element: '#monsterManagerTable',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Edit your monsters',
        description: 'Adjust stats on any monsters that need it.<br/>Make sure to mark Ready for Next Battle any monsters you want to join the next battle you start.',
        onNextClick: () => {
          driverObj.moveTo(5);
        },
        onPrevClick: () => {
          driverObj.moveTo(3);
        },
        showButtons: ['previous', 'next', 'close'],
      },
    },
    {
      element: '#mmSaveCloseButton',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Return to Battle Tracker',
        description: 'Click here to close the Monster Manager and return to the Battle Tracker.',
        onNextClick: () => {
          driverObj.moveTo(6);
          const buttons = document.querySelectorAll('[data-driver-element]');
  buttons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode?.replaceChild(newButton, button);
  });
        },
        onPrevClick: () => {
          driverObj.moveTo(4);
        },
        showButtons: ['previous', 'close'],
      },
    },
    {
      element: '#buttonStartBattle',
      popover: {
        side: "bottom",
        align: 'center',
        title: 'Start your first battle',
        description: 'If everything is ready to go, press here to Start Battle.',
        onNextClick: () => {
          driverObj.moveTo(7);
          const buttons = document.querySelectorAll('[data-driver-element]');
  buttons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode?.replaceChild(newButton, button);
  });
        },
        onPrevClick: () => {
            const element = document.getElementById("monsterManagerButton");
            if (element instanceof HTMLButtonElement) {
                element.click()}
          setTimeout(() => {
            driverObj.moveTo(5)
        const buttons = document.querySelectorAll('[data-driver-element]');
  buttons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode?.replaceChild(newButton, button);
  });}, 50);
        },
        showButtons: ['previous', 'close'],
      },
    },
    {
      element: '.popup-container',
      popover: {
        side: "top",
        align: 'center',
        title: 'Are you sure?',
        description: 'If you don\'t mind your current battle being deleted press Continue. Otherwise press the x in the corner of this box, click cancel in the popup, and come back later.',
        onNextClick: () => {
          driverObj.moveTo(8);
        },
        onPrevClick: () => {
            const element = document.querySelector(".btn-cancel");
            driverObj.moveTo(6);
            if (element instanceof HTMLButtonElement) {
                element.click()}
          
        },
        showButtons: ['previous', 'close'],
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
        },
        showButtons: ['previous', 'next', 'close'],
      },
    },
    {
      element: '#battleTracker',
      popover: {
        side: "top",
        align: 'center',
        title: 'Run your battle',
        description: 'Checking action, bonus, and move for each combatant will advance the turn.\nApply conditions as needed and hover for quick reference tooltips.\nHover over any combatant to view their stat block.\nClick a combatant\'s name to pin their details, accessing notes and source links.',
        onNextClick: () => {
          driverObj.destroy();
        },
        // showButtons: ['close'],
        disableButtons: ['previous']
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
},
onDestroyed: () => {
    const buttons = document.querySelectorAll('[data-driver-element]');
  buttons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode?.replaceChild(newButton, button);
  });
  updateSetting('tourReady', false)
}
});
}, [updateSetting]);
    return null;
}



export function startTour() {
  if (!driverObj) {
    console.error('Tour not initialized. Make sure Tour component is mounted.');
    return;
  }
  if (driverObj) {
    driverObj.destroy();
  }
  driverObj.drive();
}
