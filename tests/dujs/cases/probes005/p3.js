var x = 0;
function f() {
x = 7;
}
function a() {
x = 1;
f();
console.log(x);
}
a();
