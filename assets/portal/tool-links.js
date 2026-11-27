// Route older /tools/# links to the corresponding calculator.
const calculatorRoutes = {
  "vat": "vat-calculator",
  "discount": "discount-calculator",
  "profit": "profit-margin-calculator",
  "budget": "monthly-budget-calculator",
  "rental-yield": "rental-yield-calculator",
  "price-per-metre": "price-per-square-metre",
  "rent-installments": "rent-instalment-calculator",
  "rett": "real-estate-transaction-tax-calculator",
  "saudi-share": "saudi-employee-share-calculator",
  "overtime": "overtime-calculator",
  "end-of-service": "end-of-service-calculator",
  "dates": "date-difference-calculator"
};
function followCalculatorLink() {
  const calculator = location.hash.slice(1);
  if (Object.hasOwn(calculatorRoutes, calculator)) {
    location.replace(calculatorRoutes[calculator] + '/');
  }
}

window.addEventListener('hashchange', followCalculatorLink);
followCalculatorLink();
