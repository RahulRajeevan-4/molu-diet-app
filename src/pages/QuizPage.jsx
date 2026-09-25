import { useMemo, useState } from "react";
import { generateQuiz, QUIZ_CATEGORIES } from "../lib/quizGenerator.js";

const LENGTH_OPTIONS = [5, 10, 15, 20];

export default function QuizPage() {
  const [length, setLength] = useState(10);
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  const current = questions ? questions[index] : null;
  const finished = questions !== null && index >= questions.length;
  const score = useMemo(() => history.filter((h) => h.correct).length, [history]);

  const categoryInfo = QUIZ_CATEGORIES.find((c) => c.id === category);
  const eyebrow = categoryInfo ? `${categoryInfo.label} nutrition quiz` : "Nutrition quiz";

  function startQuiz(n, categoryId) {
    setCategory(categoryId);
    setQuestions(generateQuiz(n, categoryId));
    setIndex(0);
    setSelected(null);
    setHistory([]);
  }

  function selectOption(i) {
    if (selected !== null) return;
    setSelected(i);
    setHistory((h) => [...h, { question: current, chosenIndex: i, correct: i === current.correctIndex }]);
  }

  function nextQuestion() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function backToStart() {
    setQuestions(null);
    setIndex(0);
    setSelected(null);
    setHistory([]);
  }

  if (!questions) {
    return (
      <div className="wrap">
        <p className="eyebrow">Nutrition quiz</p>
        <h1 className="headline">Test what you know about food nutrition</h1>
        <p className="sub">
          Each quiz randomly pulls questions from the chosen clinical dataset — scientific names,
          classifications, key nutrients, micronutrients, phytochemicals and clinical notes. No two
          quizzes are the same.
        </p>

        <div className="card quiz-start">
          <h2 className="quiz-start-title">1. How many questions?</h2>
          <div className="quiz-length-grid">
            {LENGTH_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={"chip-btn" + (length === n ? " active" : "")}
                onClick={() => setLength(n)}
              >
                {n} questions
              </button>
            ))}
          </div>
          <h2 className="quiz-start-title quiz-category-title">2. Choose a quiz to start</h2>
          <div className="quiz-category-grid">
            {QUIZ_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="quiz-category-btn"
                disabled={!c.available}
                onClick={() => startQuiz(length, c.id)}
              >
                <span className="quiz-category-name">{c.label}</span>
                <span className="quiz-category-meta">
                  {c.available ? `${c.count} in dataset` : "Coming soon — no dataset yet"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="wrap">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="headline">Quiz complete</h1>

        <div className="card quiz-results">
          <div className="quiz-score">
            <span className="quiz-score-n">
              {score}/{questions.length}
            </span>
            <span className="quiz-score-pct">{pct}% correct</span>
          </div>

          <ol className="quiz-review-list">
            {history.map((h, i) => (
              <li key={i} className={"quiz-review-item" + (h.correct ? " correct" : " incorrect")}>
                <p className="quiz-review-prompt">{h.question.prompt}</p>
                <p className="quiz-review-answer">
                  Your answer: {h.question.options[h.chosenIndex]}
                  {!h.correct && (
                    <>
                      {" "}
                      · Correct: <b>{h.question.options[h.question.correctIndex]}</b>
                    </>
                  )}
                </p>
                <p className="quiz-review-explanation">{h.question.explanation}</p>
              </li>
            ))}
          </ol>

          <div className="quiz-results-actions">
            <button type="button" className="chip-btn active" onClick={() => startQuiz(length, category)}>
              Play again ({categoryInfo.label}, {length} questions)
            </button>
            <button type="button" className="chip-btn" onClick={backToStart}>
              Choose another quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="headline">Question {index + 1} of {questions.length}</h1>

      <div className="quiz-progress-track">
        <div
          className="quiz-progress-fill"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="card quiz-question">
        <p className="quiz-score-live">
          Score: {score}/{history.length}
        </p>
        <p className="quiz-prompt">{current.prompt}</p>

        <div className="quiz-choices">
          {current.options.map((opt, i) => {
            let cls = "quiz-choice";
            if (selected !== null) {
              if (i === current.correctIndex) cls += " correct";
              else if (i === selected) cls += " incorrect";
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => selectOption(i)}
                disabled={selected !== null}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="quiz-explanation">
            <p>{current.explanation}</p>
            <button type="button" className="chip-btn active" onClick={nextQuestion}>
              {index + 1 === questions.length ? "See results" : "Next question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
