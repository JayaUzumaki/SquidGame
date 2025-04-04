import React, { useState, useEffect } from "react";
import pb from "./pocketbase"; // PocketBase instance

const Quiz = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [quizHidden, setQuizHidden] = useState(false);
  const [disqualified, setDisqualified] = useState(false);

  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
          console.error("No user logged in");
          return;
        }

        const player = await pb.collection("players").getOne(currentUser.id);
        setUser(player);

        if (player.attempted || player.moved) {
          setDisqualified(true);
          return;
        }

        await pb.collection("players").update(player.id, { attempted: true });

        const records = await pb.collection("questions").getFullList({
          page: 1,
          perPage: 500,
          skipTotal: true,
        });

        setQuestions(records);
      } catch (error) {
        console.error("Error initializing quiz:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeQuiz();

    const checkQuizVisibility = async () => {
      const record = await pb.collection("state").getFirstListItem();
      if (record) {
        setQuizHidden(!record.light);
      }
    };

    checkQuizVisibility();
    const interval = setInterval(checkQuizVisibility, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!quizHidden || disqualified) return;

    const handleCheating = async () => {
      if (user) {
        try {
          await pb.collection("players").update(user.id, { moved: true });
        } catch (err) {
          console.error("Failed to update moved flag:", err);
        }
      }
      setDisqualified(true);
    };

    window.addEventListener("mousemove", handleCheating);
    window.addEventListener("keydown", handleCheating);

    return () => {
      window.removeEventListener("mousemove", handleCheating);
      window.removeEventListener("keydown", handleCheating);
    };
  }, [quizHidden, user, disqualified]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const currentQuestion = questions[currentQuestionIndex];
  const options = Array.isArray(currentQuestion?.options)
    ? currentQuestion.options
    : JSON.parse(currentQuestion?.options || "[]");

  const handleOptionSelect = (index) => {
    if (quizHidden || disqualified) return;
    setSelectedOption(index);
  };

  const saveResponse = () => {
    if (selectedOption === null) return;

    if (selectedOption === currentQuestion.index) {
      setScore((prevScore) => prevScore + 1);
    }

    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = {
      question_id: currentQuestion.id,
      selected_option: options[selectedOption],
    };
    setResponses(updatedResponses);
  };

  const handleNextQuestion = () => {
    saveResponse();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
    }
  };

  const handleSubmitQuiz = async () => {
    saveResponse();

    try {
      if (!user) {
        console.error("User not loaded");
        return;
      }

      await pb.collection("responses").create({
        user_id: user.id,
        answers: responses,
        score: score,
        timestamp: new Date().toISOString(),
        eliminated: disqualified,
      });

      // ✅ Save score in players collection
      await pb.collection("players").update(user.id, {
        score: score,
      });

      if (!disqualified) {
        alert(`Quiz submitted! Your score: ${score}/${questions.length}`);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) return <p>Loading...</p>;

  if (disqualified) {
    return (
      <div style={{ backgroundColor: "red", color: "white", padding: "2rem" }}>
        <h1>Disqualified! ❌</h1>
        <p>
          You have either already attempted the quiz or moved during Red Light.
        </p>
      </div>
    );
  }

  if (questions.length === 0) return <p>No questions available.</p>;

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          marginBottom: "1rem",
          fontSize: "1.2rem",
          fontWeight: "bold",
        }}
      >
        ⏱ Time Left: {formatTime(timeLeft)}
      </div>

      {quizHidden ? (
        <div
          style={{
            backgroundColor: "red",
            color: "white",
            padding: "2rem",
            borderRadius: "10px",
          }}
        >
          <h2>🛑 RED LIGHT</h2>
          <p>Do NOT move! You're being watched 👀</p>
        </div>
      ) : (
        <>
          <h2 style={{ marginBottom: "1rem" }}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </h2>
          <p style={{ fontSize: "1.1rem", marginBottom: "2rem" }}>
            {currentQuestion.question}
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                style={{
                  padding: "1rem",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "1rem",
                  cursor: "pointer",
                  backgroundColor:
                    selectedOption === index ? "#4a4a4a" : "#007bff",
                  color: "white",
                  transition: "all 0.2s",
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <div style={{ marginTop: "2rem" }}>
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                disabled={selectedOption === null}
                style={{
                  marginTop: "1rem",
                  padding: "0.8rem 2rem",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: selectedOption === null ? "gray" : "green",
                  color: "white",
                  cursor: selectedOption === null ? "not-allowed" : "pointer",
                }}
              >
                Next ➡️
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={selectedOption === null}
                style={{
                  marginTop: "1rem",
                  padding: "0.8rem 2rem",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: selectedOption === null ? "grey" : "#28a745",
                  color: "white",
                  cursor: selectedOption === null ? "not-allowed" : "pointer",
                }}
              >
                ✅ Submit
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Quiz;
