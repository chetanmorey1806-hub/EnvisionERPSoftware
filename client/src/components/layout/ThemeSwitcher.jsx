import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { Icons } from '../common/icons';

const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const Icon = theme === 'light' ? Icons.moon : Icons.sun;

  return (
    <button
      onClick={toggleTheme}
      className="erp-icon-btn"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
};

export default ThemeSwitcher;
