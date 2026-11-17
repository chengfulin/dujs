var x = 0;
function f() {
x = 1;
f();
}
f();
console.log(x);
