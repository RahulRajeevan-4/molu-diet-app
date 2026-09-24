import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import FruitTablePage from "./pages/FruitTablePage.jsx";
import RecipeBuilderPage from "./pages/RecipeBuilderPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import NutritionCalculatorPage from "./pages/NutritionCalculatorPage.jsx";
import "./App.css";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<FruitTablePage />} />
        <Route path="/recipes" element={<RecipeBuilderPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/calculator" element={<NutritionCalculatorPage />} />
      </Routes>
    </>
  );
}
