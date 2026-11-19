// should handle function calls and new statements that might throw
/*
n0 [label="entry", shape="ellipse", style="filled", fillcolor="yellow"]
n1 [label="1"]
n2 [label="call()"]
n3 [label="exit", shape="ellipse", style="filled", fillcolor="yellow"]
n4 [label="new klass()"]
n5 [label="statement"]
n0 -> n1 []
n1 -> n2 [label="true"]
n1 -> n4 [label="false"]
n2 -> n4 []
n2 -> n3 [color="red", label="exception"]
n4 -> n5 []
n4 -> n3 [color="red", label="exception"]
n5 -> n3 []
*/
1 && call();
new klass();
statement;
