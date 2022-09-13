import '@testing-library/cypress/add-commands';
import './commands';

// eslint-disable-next-line consistent-return
Cypress.on('uncaught:exception', (error) => {
  // Cypress and React Hydrating the document don't get along
  // for some unknown reason. Hopefully we figure out why eventually
  // so we can remove this.
  if (
    /hydrat/i.test(error.message) ||
    /Minified React error #418/.test(error.message) ||
    /Minified React error #423/.test(error.message)
  ) {
    return false;
  }
});
