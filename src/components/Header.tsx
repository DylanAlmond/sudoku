import ThemeToggle from './ThemeToggle';
import Github from '../assets/github.svg?react';

const Header = () => {
  return (
    <header className='header'>
      <ThemeToggle />

      <h1>Sudoku</h1>

      <a
        className='button button--outline button--icon'
        href='https://github.com/DylanAlmond/sudoku.git'
        title='Github'
      >
        <Github />
      </a>
    </header>
  );
};

export default Header;
