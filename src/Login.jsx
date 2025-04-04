import React, { useState } from "react";
import pb from "./pocketbase"; // Import PocketBase instance

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Authenticate user
      const authData = await pb
        .collection("players")
        .authWithPassword(email, password);

      // Get user role from auth data
      const userRole = authData.record.role; // Assuming 'role' is stored in the 'players' collection

      if (userRole === "player") {
        window.location.href = "/quiz"; // Redirect to the quiz page
      } else if (userRole === "admin") {
        window.location.href = "/admin"; // Redirect to the admin panel
      } else {
        setError("Unauthorized role detected!");
      }
    } catch (err) {
      setError("Invalid email or password. " + err.message);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
