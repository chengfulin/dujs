const cats = ["Leopard", "Serval", "Jaguar", "Tiger", "Caracal", "Lion"];
const pElem = document.querySelector("p");

let myFavoriteCats = "My favorite big cats are ";

let i = 0;

do {
  if (i === cats.length - 1) {
    myFavoriteCats += `and ${cats[i]}.`;
  } else {
    myFavoriteCats += `${cats[i]}, `;
  }

  i++;
} while (i < cats.length);

pElem.textContent = myFavoriteCats;
