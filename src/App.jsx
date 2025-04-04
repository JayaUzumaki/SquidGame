import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./login";
import Quiz from "./Quiz"; // Import Quiz component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/quiz" element={<Quiz />} /> {/* New route for the quiz */}
      </Routes>
    </Router>
  );
}

export default App;
