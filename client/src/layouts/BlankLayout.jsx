import React from 'react';

const BlankLayout = ({ children }) => {
  return (
    <div className="w-full min-h-screen bg-white font-sans antialiased">
      {children}
    </div>
  );
};

export default BlankLayout;