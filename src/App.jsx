import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./login";
import Quiz from "./Quiz"; // Import Quiz component
import AdminPanel from "./Admin"; // Import AdminPanel component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/quiz" element={<Quiz />} /> {/* Route for the quiz */}
        <Route path="/admin" element={<AdminPanel />} />{" "}
        {/* Route for admin panel */}
      </Routes>
    </Router>
  );
}

export default App;
