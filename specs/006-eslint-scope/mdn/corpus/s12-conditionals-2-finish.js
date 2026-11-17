let response;
let score = 75;
let machineActive = false;

if (machineActive) {
  if (score < 0 || score > 100) {
    response = "This is not possible, an error has occurred.";
  } else if (score >= 0 && score < 20) {
    response = "That was a terrible score — total fail!";
  } else if (score >= 20 && score < 40) {
    response =
      "You know some things, but it's a pretty bad score. Needs improvement.";
  } else if (score >= 40 && score < 70) {
    response = "You did a passable job, not bad!";
  } else if (score >= 70 && score < 90) {
    response = "That's a great score, you really know your stuff.";
  } else if (score >= 90 && score <= 100) {
    response = "What an amazing score! Did you cheat? Are you for real?";
  }
} else {
  response = "The machine is turned off. Turn it on to process your score.";
}

const section = document.querySelector("section");
const para1 = document.createElement("p");
const para2 = document.createElement("p");
para1.textContent = `Your score is ${score}`;
para2.textContent = response;
section.appendChild(para1);
section.appendChild(para2);
