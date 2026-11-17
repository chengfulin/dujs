var x = 0;
function set() {
x = 1;
}
function get() {
return x;
}
set();
get();
console.log(x);
x = 2;
get();
console.log(x);
