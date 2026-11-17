let state = "idle";
function doSomethingErrorProne() {
if (ourCodeMakesAMistake()) {
throw new Error("The message");
}
doSomethingToGetAJavaScriptError();
state = "done";
}
try {
doSomethingErrorProne();
} catch (e) {
console.error(e.name);
console.error(state);
}
console.log(state);
