const checkBox = document.querySelector("input");
const para = document.querySelector("p");
let shoppingDone = false;

checkBox.addEventListener("change", () => {
  if (shoppingDone === false) {
    shoppingDone = true;
  } else {
    shoppingDone = false;
  }
  updateAllowance();
});

function updateAllowance() {
  let childAllowance;
  if (shoppingDone === true) {
    childAllowance = 10;
  } else {
    childAllowance = 5;
  }

  para.textContent = `Child has earned $${childAllowance} this week.`;
}

updateAllowance();
