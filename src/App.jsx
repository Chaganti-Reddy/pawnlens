import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReviewerProvider } from './context/ReviewerContext.jsx';
import TopBar from './components/TopBar.jsx';
import Home from './pages/Home.jsx';
import Review from './pages/Review.jsx';
import Weakness from './pages/Weakness.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ReviewerProvider>
        <div className="app">
          <TopBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/review" element={<Review />} />
            <Route path="/weaknesses" element={<Weakness />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </ReviewerProvider>
    </BrowserRouter>
  );
}
