const cats = ["Leopard", "Serval", "Jaguar", "Tiger", "Caracal", "Lion"];
const pElem = document.querySelector("p");

let myFavoriteCats = "My favorite big cats are ";

for (let i = 0; i < cats.length; i++) {
  if (i === cats.length - 1) {
    // We are at the end of the array
    myFavoriteCats += `and ${cats[i]}.`;
  } else {
    myFavoriteCats += `${cats[i]}, `;
  }
}

pElem.textContent = myFavoriteCats;
