class A {
 constructor() { this.x = 1; }
 static make() { new A(); }
}
A.make();
A = null;
