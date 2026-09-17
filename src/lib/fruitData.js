import rawFruits from "../data/fruits.json";
import { deriveFruit } from "../utils/deriveFruit.js";

export const FRUITS = rawFruits.map(deriveFruit);
