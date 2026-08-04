import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import { InboxProvider } from './context/InboxContext';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              <SocketProvider>
                <InboxProvider>
                  <div className="min-h-screen font-sans antialiased selection:bg-blue-500 selection:text-white">
                    <AppRoutes />
                  </div>
                </InboxProvider>
              </SocketProvider>
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </NotificationProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;