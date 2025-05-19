import { useTheme } from '../context/ThemeContext';
import Sun from '../assets/sun.svg?react';
import Moon from '../assets/moon.svg?react';

const ThemeToggle = ({ ...props }: React.ComponentProps<'button'>) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className='button button--outline button--icon'
      title='Toggle Theme'
      onClick={toggleTheme}
      {...props}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
};

export default ThemeToggle;
