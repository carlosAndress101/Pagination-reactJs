import { useState } from "react";
import { useEffect } from "react";
import "../style/style.css";
const renderData = (data) => {
  return (
    <ul>
      {data.map((todo, index) => {
        return <li key={index}>{todo.title}</li>;
      })}
    </ul>
  );
};

const Pagination = () => {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPage, setItemsPage] = useState(5);

  const [pageNumberLimit, setPageNumberLimit] = useState(5);
  const [maxNumberLimit, setMaxPageNumberLimit] = useState(5);
  const [minPageNumberLimit, setMinPageNumberLimit] = useState(0);

  const haddleClick = (event) => {
    setCurrentPage(Number(event.target.id));
  };

  const pages = [];

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
          id={number}
          onClick={haddleClick}
          className={currentPage == number ? "active" : null}
        >
          {number}
        </li>
      );
    } else {
      return null;
    }
  });

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/todos")
      .then((response) => response.json())
      .then((json) => setData(json));
  }, []);

  const haddleNext = () => {
    setCurrentPage(currentPage + 1);

    if (currentPage + 1 > maxNumberLimit) {
      setMaxPageNumberLimit(maxNumberLimit + pageNumberLimit);
      setMinPageNumberLimit(minPageNumberLimit + pageNumberLimit);
    }
  };

  const haddlePrev = () => {
    setCurrentPage(currentPage - 1);

    if ((currentPage - 1) % pageNumberLimit == 0) {
      setMaxPageNumberLimit(maxNumberLimit - pageNumberLimit);
      setMinPageNumberLimit(minPageNumberLimit - pageNumberLimit);
    }
  };

  let pageIncrementBtn = null;
  if(pages.length > maxNumberLimit){
    pageIncrementBtn = <li onClick={haddleNext}> &hellip; </li>;
  }
  
  let pageDecrementBtn = null;
  if(minPageNumberLimit >= 1){
    pageDecrementBtn = <li onClick={haddlePrev}> &hellip; </li>;
  }

  const haddleLoadMore = () =>{
    setItemsPage(itemsPage + 5)
  }

  return (
    <>
      <h1>Todo List</h1> <br />
      {renderData(currentItems)}
      <ul className="pageNumbers">
        <li>
          <button onClick={haddlePrev} disabled={currentPage== pages[0] ? true : false}>Prev</button>
        </li>
        {pageDecrementBtn}
        {renderPageNumbers}
        {pageIncrementBtn}
        <li>
          <button onClick={haddleNext} disabled={currentPage == pages[pages.length -1] ? true : false}>Next</button>
        </li>
      </ul>
      <button className="loadmore" onClick={haddleLoadMore}>Load More</button>
    </>
  );
};

export default Pagination;
