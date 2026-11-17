let count = 0;
class Person {
name = count;
constructor(name) {
count = count + 1;
this.name = name;
}
}
new Person("Giles");
console.log(count);
