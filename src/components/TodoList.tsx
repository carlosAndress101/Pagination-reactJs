import type { Todo } from '../types';

interface TodoListProps {
  items: Todo[];
}

export function TodoList({ items }: TodoListProps) {
  if (items.length === 0) {
    return <p className="empty-state">No hay resultados que mostrar.</p>;
  }

  return (
    <ul className="todo-list">
      {items.map((todo) => (
        <li key={todo.id} className="todo-list__item">
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
