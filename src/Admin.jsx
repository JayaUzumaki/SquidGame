import React, { useState, useEffect } from "react";
import pb from "./pocketbase"; // PocketBase instance

const AdminPanel = () => {
  const [lightStatus, setLightStatus] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    const fetchControlStatus = async () => {
      try {
        const record = await pb.collection("state").getFirstListItem(); // ✅ fixed collection name
        if (record) {
          setLightStatus(record.light);
          setRecordId(record.id);
        } else {
          const newRecord = await pb.collection("state").create({ light: false });
          setRecordId(newRecord.id);
        }
      } catch (error) {
        console.error("Error fetching state:", error);
      }
    };

    fetchControlStatus();
    fetchPlayers();
  }, []);

  const toggleQuizVisibility = async (status) => {
    if (!recordId) return;
    try {
      await pb.collection("state").update(recordId, { light: status }); // ✅ fixed collection name
      setLightStatus(status);
    } catch (error) {
      console.error("Error updating state:", error);
    }
  };

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const records = await pb.collection("players").getFullList({});
      setPlayers(records);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const resetPlayers = async () => {
    try {
      const records = await pb.collection("players").getFullList({});
      for (const player of records) {
        await pb.collection("players").update(player.id, {
          attempted: false,
          moved: false,
        });
      }
      fetchPlayers();
      alert("All players have been reset.");
    } catch (error) {
      console.error("Error resetting players:", error);
    }
  };

  const disqualifyPlayer = async (id) => {
    try {
      await pb.collection("players").update(id, { moved: true });
      fetchPlayers();
      alert("Player disqualified.");
    } catch (error) {
      console.error("Error disqualifying player:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🛠 Admin Control Panel</h2>
      <h3>Current Light: {lightStatus ? "🟢 Green" : "🔴 Red"}</h3>

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={() => toggleQuizVisibility(false)}
          style={{ background: "red", color: "white", marginRight: "10px" }}
        >
          Red Light (Hide Quiz)
        </button>
        <button
          onClick={() => toggleQuizVisibility(true)}
          style={{ background: "green", color: "white" }}
        >
          Green Light (Unhide Quiz)
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={resetPlayers} style={{ background: "orange", color: "white" }}>
          🔄 Reset All Players
        </button>
      </div>

      <h3>👥 Player Status</h3>
      {loadingPlayers ? (
        <p>Loading players...</p>
      ) : (
        <table border="1" cellPadding="10" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Attempted</th>
              <th>Moved</th>
              <th>Disqualify</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>{player.username}</td>
                <td>{player.email}</td>
                <td>{player.attempted ? "✅" : "❌"}</td>
                <td>{player.moved ? "❌ Disqualified" : "✅ Safe"}</td>
                <td>
                  <button
                    onClick={() => disqualifyPlayer(player.id)}
                    style={{ backgroundColor: "black", color: "white" }}
                  >
                    Disqualify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPanel;
