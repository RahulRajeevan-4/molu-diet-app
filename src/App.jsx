import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import HomePage from "./pages/HomePage.jsx";
import FruitTablePage from "./pages/FruitTablePage.jsx";
import RecipeBuilderPage from "./pages/RecipeBuilderPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import NutritionCalculatorPage from "./pages/NutritionCalculatorPage.jsx";
import "./App.css";

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      {pathname !== "/" && <NavBar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/fruits" element={<FruitTablePage />} />
        <Route path="/recipes" element={<RecipeBuilderPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/calculator" element={<NutritionCalculatorPage />} />
      </Routes>
    </>
  );
}
