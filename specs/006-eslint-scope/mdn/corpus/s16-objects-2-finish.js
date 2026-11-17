let bandInfo;

const band = {
  name: "Black Sabbath",
  nationality: "British",
  genre: "heavy metal",
  members: 4,
  formed: 1968,
  split: 2025,
  albums: [
    {
      name: "Black Sabbath",
      released: 1970,
    },
    {
      name: "Paranoid",
      released: 1970,
    },
    {
      name: "Master of Reality",
      released: 1971,
    },
    {
      name: "Vol. 4",
      released: 1972,
    },
  ],
};

bandInfo = `The ${band.nationality} ${band.genre} band ${band.name} were active between ${band.formed} and ${band.split}. Their first album, ${band.albums[0].name}, was released in ${band.albums[0].released}.`;

const section = document.querySelector("section");
let para1 = document.createElement("p");
para1.textContent = bandInfo;
section.appendChild(para1);
