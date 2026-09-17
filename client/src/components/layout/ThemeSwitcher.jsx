import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { Icons } from '../common/icons';

const ThemeSwitcher = () => {
  const { resolved, toggleTheme } = useContext(ThemeContext);
  const Icon = resolved === 'light' ? Icons.moon : Icons.sun;

  return (
    <button
      onClick={toggleTheme}
      className="erp-icon-btn"
      aria-label={`Switch to ${resolved === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${resolved === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
};

export default ThemeSwitcher;
