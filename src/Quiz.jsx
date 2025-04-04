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

        // Disqualify if already attempted or moved
        if (player.attempted || player.moved) {
          setDisqualified(true);
          return;
        }

        // First attempt — mark as attempted
        await pb.collection("players").update(player.id, { attempted: true });

        // Load questions
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

    // Fetch red/green light status
    const checkQuizVisibility = async () => {
      const record = await pb.collection("state").getFirstListItem();
      if (record) {
        setQuizHidden(!record.light); // light = true (Green), false (Red)
      }
    };

    checkQuizVisibility();
    const interval = setInterval(checkQuizVisibility, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, []);

  // ⛔ Detect cheating movement during Red Light
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
        <p>You have either already attempted the quiz or moved during Red Light.</p>
      </div>
    );
  }

  if (questions.length === 0) return <p>No questions available.</p>;

  return (
    <div>
      <h2>Time Left: {formatTime(timeLeft)}</h2>

      {quizHidden ? (
        <h2 style={{ color: "red" }}>🛑 Red Light! Do NOT move!</h2>
      ) : (
        <>
          <h2>Question {currentQuestionIndex + 1}</h2>
          <p>{currentQuestion.question}</p>
          <ul>
            {options.map((option, index) => (
              <li
                key={index}
                onClick={() => handleOptionSelect(index)}
                style={{
                  cursor: "pointer",
                  backgroundColor: selectedOption === index ? "gray" : "blue",
                  padding: "10px",
                  margin: "5px",
                  border: "1px solid black",
                  color: "white",
                }}
              >
                {option}
              </li>
            ))}
          </ul>
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              disabled={selectedOption === null}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={selectedOption === null}
            >
              Submit
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Quiz;

