import React, { useState, useEffect } from "react";
import pb from "./pocketbase"; // Ensure correct import of PocketBase instance

const Quiz = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600 seconds)

  useEffect(() => {
    const fetchUserAndQuestions = async () => {
      try {
        const user = pb.authStore.model;
        if (user) {
          setUserId(user.id);
        } else {
          console.error("No user logged in");
          return;
        }

        const records = await pb.collection("questions").getFullList({
          page: 1,
          perPage: 500,
          skipTotal: true,
        });

        setQuestions(records);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndQuestions();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitQuiz(); // Auto-submit when timer reaches 0
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer); // Cleanup on unmount
  }, [timeLeft]);

  if (loading) return <p>Loading questions...</p>;
  if (questions.length === 0) return <p>No questions available.</p>;

  const currentQuestion = questions[currentQuestionIndex];
  const options = Array.isArray(currentQuestion.options)
    ? currentQuestion.options
    : JSON.parse(currentQuestion.options || "[]");

  const handleOptionSelect = (index) => {
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
      if (!userId) {
        console.error("User not logged in");
        return;
      }

      if (responses.length !== questions.length) {
        alert("Time's up! Submitting your quiz...");
      }

      await pb.collection("responses").create({
        user_id: userId,
        answers: responses,
        score: score,
        timestamp: new Date().toISOString(),
      });

      alert(`Quiz submitted! Your score: ${score}/${questions.length}`);
    } catch (error) {
      console.error("Error submitting quiz:", error);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div>
      <h2>Time Left: {formatTime(timeLeft)}</h2>
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
            }}
          >
            {option}
          </li>
        ))}
      </ul>
      {currentQuestionIndex < questions.length - 1 ? (
        <button onClick={handleNextQuestion} disabled={selectedOption === null}>
          Next
        </button>
      ) : (
        <button onClick={handleSubmitQuiz} disabled={selectedOption === null}>
          Submit
        </button>
      )}
    </div>
  );
};

export default Quiz;
