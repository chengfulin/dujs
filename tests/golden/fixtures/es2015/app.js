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
