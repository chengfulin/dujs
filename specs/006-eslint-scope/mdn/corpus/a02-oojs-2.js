class Shape {
  name;
  sides;
  sideLength;

  constructor(name, sides, sideLength) {
    this.name = name;
    this.sides = sides;
    this.sideLength = sideLength;
  }

  calcPerimeter() {
    console.log(
      `The ${this.name}'s perimeter length is ${this.sides * this.sideLength}.`,
    );
  }
}

// Don't edit the code above here!
