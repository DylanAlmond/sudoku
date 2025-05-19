import Header from './components/Header';
import Sudoku from './components/Sudoku';
import { SudokuProvider } from './context/SudokuContext';
import { ThemeProvider } from './context/ThemeContext';

const App = () => {
  return (
    <ThemeProvider>
      <SudokuProvider>
        <Header />
        <Sudoku />
      </SudokuProvider>
    </ThemeProvider>
  );
};

export default App;

