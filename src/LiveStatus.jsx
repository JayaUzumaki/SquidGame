import React, { useEffect, useState } from "react";
import pb from "./pocketbase"; // PocketBase instance

const LiveStatus = () => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const records = await pb.collection("players").getFullList({});
        setPlayers(records);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000); // Refresh every 5 sec

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🎮 Live Player Status</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              backgroundColor: player.moved ? "red" : "green",
              color: "white",
              padding: "1rem",
              borderRadius: "8px",
              minWidth: "150px",
              textAlign: "center",
              fontWeight: "bold",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              transition: "background-color 0.3s ease",
            }}
          >
            {player.username}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveStatus;
