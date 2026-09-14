import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Todo } from '../types';
import '../style/style.css';

/**
 * D13 corregido: antes era un `useState` cuyo setter no se invocaba nunca.
 * Es una constante, no estado.
 */
const PAGE_NUMBER_LIMIT = 5;

const renderData = (data: Todo[]) => {
  return (
    <ul>
      {data.map((todo) => {
        return <li key={todo.id}>{todo.title}</li>;
      })}
    </ul>
  );
};

const Pagination = () => {
  const [data, setData] = useState<Todo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPage, setItemsPage] = useState(5);

  const [maxNumberLimit, setMaxPageNumberLimit] = useState(5);
  const [minPageNumberLimit, setMinPageNumberLimit] = useState(0);

  const haddleClick = (event: MouseEvent<HTMLLIElement>) => {
    const id = event.target instanceof Element ? event.target.id : undefined;
    setCurrentPage(Number(id));
  };

  const pages: number[] = [];

  for (let i = 1; i <= Math.ceil(data.length / itemsPage); i++) {
    pages.push(i);
  }
  const indexOfLastItem = currentPage * itemsPage;
  const indexOfFirstItem = indexOfLastItem - itemsPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const renderPageNumbers = pages.map((number) => {
    if (number < maxNumberLimit + 1 && number > minPageNumberLimit) {
      return (
        <li
          key={number}
          id={String(number)}
          onClick={haddleClick}
          className={currentPage === number ? 'active' : undefined}
        >
          {number}
        </li>
      );
    } else {
      return null;
    }
  });

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos')
      .then((response) => response.json() as Promise<Todo[]>)
      .then((json) => setData(json));
  }, []);

  const haddleNext = () => {
    setCurrentPage(currentPage + 1);

    if (currentPage + 1 > maxNumberLimit) {
      setMaxPageNumberLimit(maxNumberLimit + PAGE_NUMBER_LIMIT);
      setMinPageNumberLimit(minPageNumberLimit + PAGE_NUMBER_LIMIT);
    }
  };

  const haddlePrev = () => {
    setCurrentPage(currentPage - 1);

    if ((currentPage - 1) % PAGE_NUMBER_LIMIT === 0) {
      setMaxPageNumberLimit(maxNumberLimit - PAGE_NUMBER_LIMIT);
      setMinPageNumberLimit(minPageNumberLimit - PAGE_NUMBER_LIMIT);
    }
  };

  let pageIncrementBtn = null;
  if (pages.length > maxNumberLimit) {
    pageIncrementBtn = <li onClick={haddleNext}> &hellip; </li>;
  }

  let pageDecrementBtn = null;
  if (minPageNumberLimit >= 1) {
    pageDecrementBtn = <li onClick={haddlePrev}> &hellip; </li>;
  }

  const haddleLoadMore = () => {
    setItemsPage(itemsPage + 5);
  };

  return (
    <>
      <h1>Todo List</h1> <br />
      {renderData(currentItems)}
      <ul className="pageNumbers">
        <li>
          <button onClick={haddlePrev} disabled={currentPage === pages[0]}>
            Prev
          </button>
        </li>
        {pageDecrementBtn}
        {renderPageNumbers}
        {pageIncrementBtn}
        <li>
          <button onClick={haddleNext} disabled={currentPage === pages[pages.length - 1]}>
            Next
          </button>
        </li>
      </ul>
      <button className="loadmore" onClick={haddleLoadMore}>
        Load More
      </button>
    </>
  );
};

export default Pagination;
