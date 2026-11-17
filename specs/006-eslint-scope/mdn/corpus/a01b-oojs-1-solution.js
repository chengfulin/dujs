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

const square = new Shape("square", 4, 5);
square.calcPerimeter();

const triangle = new Shape("triangle", 3, 3);
triangle.calcPerimeter();
