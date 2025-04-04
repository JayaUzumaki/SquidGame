import React, { useState, useEffect } from "react";
import pb from "./pocketbase"; // PocketBase instance

const AdminPanel = () => {
  const [lightStatus, setLightStatus] = useState(false);
  const [recordId, setRecordId] = useState(null);

  useEffect(() => {
    const fetchControlStatus = async () => {
      try {
        const record = await pb.collection("status").getFirstListItem();
        if (record) {
          setLightStatus(record.light); // Use 'light' field
          setRecordId(record.id); // Save record ID for updating
        } else {
          console.warn("No control record found. Creating a new one...");
          const newRecord = await pb.collection("status").create({
            light: false, // Default to Red Light (hidden)
          });
          setRecordId(newRecord.id);
        }
      } catch (error) {
        console.error("Error fetching status:", error);
      }
    };

    fetchControlStatus();
  }, []);

  const toggleQuizVisibility = async (status) => {
    if (!recordId) return;

    try {
      await pb.collection("status").update(recordId, { light: status });
      setLightStatus(status);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div>
      <h2>Admin Control Panel</h2>
      <button
        onClick={() => toggleQuizVisibility(false)}
        style={{ background: "red", color: "white" }}
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
  );
};

export default AdminPanel;
