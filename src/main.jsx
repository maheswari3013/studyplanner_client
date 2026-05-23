import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ColorProvider } from './context/ColorConstraints.jsx'
import { ScheduleProvider } from './context/ScheduleContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx';

import './assets/variables.css'
import './assets/styles.css'

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ColorProvider>
          <AuthProvider>
            <ScheduleProvider>
              <ErrorBoundary>
                  <App />
              </ErrorBoundary>
            </ScheduleProvider>
          </AuthProvider>
        </ColorProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
