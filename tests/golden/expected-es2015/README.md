# dujs analysis results

Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).

## Page 0

### Source code

[`page0/src.js`](page0/src.js)

```js
/// --- start fixtures/es2015/app.js ---
import { loadTodos, saveTodos } from './storage.js';

const state = { todos: [], filter: 'all' };
let nextId = 1;

class TodoList {
  constructor(root) {
    this.root = root;
  }
  render(todos) {
    const visible = todos.filter(({ done }) => state.filter === 'all' || !done);
    this.root.textContent = `${visible.length} items`;
  }
}

const list = new TodoList(document.getElementById('list'));

const addTodo = (title = '') => {
  if (!title.trim()) {
    return;
  }
  state.todos = [...state.todos, { id: nextId++, title, done: false }];
  saveTodos(state.todos);
  list.render(state.todos);
};

async function init() {
  const saved = await loadTodos();
  for (const { id } of saved ?? []) {
    nextId = Math.max(nextId, id + 1);
  }
  state.todos = saved;
  list.render(state.todos);
}

window.addEventListener('load', init);
document.getElementById('add').addEventListener('click', () => {
  const input = document.getElementById('title');
  addTodo(input?.value);
  input.value = '';
});

/// --- end fixtures/es2015/app.js ---
```

### Intra-procedural

- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0`](page0/intra-procedurals/1.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1`](page0/intra-procedurals/2.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1.$ANONYMOUS_FUN_2`](page0/intra-procedurals/3.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3`](page0/intra-procedurals/4.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.init`](page0/intra-procedurals/5.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_4`](page0/intra-procedurals/6.md)

### Inter-procedural

- [`inter-procedural: $DOMAIN.$PAGE_0`](page0/inter-procedurals/0.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3`](page0/inter-procedurals/1.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.init`](page0/inter-procedurals/2.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_4`](page0/inter-procedurals/3.md)

### Intra-page

- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)

## Inter-page

- [`inter-page`](inter-page/0.md)
