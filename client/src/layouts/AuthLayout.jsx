import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Column: Interactive Form Window */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white z-10 shadow-2xl">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {children}
        </div>
      </div>
      
      {/* Right Column: Visual Branding Sidebar panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-600/20 to-purple-600/20 z-0" />
        <div className="max-w-md text-center z-10">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-blue-400">Envision-ERP</h2>
          <p className="text-slate-300 text-lg">
            Streamlining institutional workflows, asset logistics, and academic cycles with data intelligence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;