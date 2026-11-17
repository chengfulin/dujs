let r = 0;
let i = 0;
while (i < 2) {
i = i + 1;
try {
r = 1;
continue;
} finally {
r = 3;
}
}
console.log(r);
