import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import AdminDocuments from './pages/AdminDocuments';
import TimetablePlanner from './pages/TimetablePlanner';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <div className="min-h-screen bg-navy-900 dark:bg-navy-900">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/documents" element={<AdminDocuments />} />
              <Route path="/planner" element={<TimetablePlanner />} />
            </Routes>
          </div>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
