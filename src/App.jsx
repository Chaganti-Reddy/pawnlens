import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReviewerProvider } from './context/ReviewerContext.jsx';
import TopBar from './components/TopBar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Review from './pages/Review.jsx';
import Weakness from './pages/Weakness.jsx';
import Train from './pages/Train.jsx';
import Drills from './pages/Drills.jsx';
import OpeningsDrill from './pages/OpeningsDrill.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ReviewerProvider>
        <div className="app">
          <TopBar />
          <div className="app-body">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/review" element={<Review />} />
              <Route path="/train" element={<Train />} />
              <Route path="/drills" element={<Drills />} />
              <Route path="/openings" element={<OpeningsDrill />} />
              <Route path="/weaknesses" element={<Weakness />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </ReviewerProvider>
    </BrowserRouter>
  );
}
