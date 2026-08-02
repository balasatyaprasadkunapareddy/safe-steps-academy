import pedestrian from "@/assets/lesson-pedestrian.jpg";
import bicycle from "@/assets/lesson-bicycle.jpg";
import twowheeler from "@/assets/lesson-twowheeler.jpg";
import bus from "@/assets/lesson-bus.jpg";

export const lessonImages: Record<string, string> = {
  pedestrian,
  bicycle,
  twowheeler,
  bus,
};

export function lessonImage(key: string | null | undefined) {
  return (key && lessonImages[key]) || pedestrian;
}

export const XP_PER_CORRECT = 10;

export type SurveyQuestion = {
  id: string;
  question: string;
  options: string[];
  /** index of the "most aware" answer */
  awareIndex: number;
};

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: "helmet",
    question: "How often do you wear a helmet when travelling on a two-wheeler?",
    options: ["Always", "Sometimes", "Rarely", "Never"],
    awareIndex: 0,
  },
  {
    id: "crossing",
    question: "Where do you usually cross the road near your school?",
    options: ["Zebra crossing / signal", "Wherever it is shortest", "Between parked vehicles", "I do not cross roads"],
    awareIndex: 0,
  },
  {
    id: "seatbelt",
    question: "Do you wear a seat belt when sitting in the rear seat of a car?",
    options: ["Always", "Sometimes", "Rarely", "Never"],
    awareIndex: 0,
  },
  {
    id: "phone",
    question: "Do you use a mobile phone or headphones while walking on the road?",
    options: ["Never", "Rarely", "Sometimes", "Often"],
    awareIndex: 0,
  },
  {
    id: "signs",
    question: "How well can you identify common traffic signs?",
    options: ["Very well", "Moderately", "A little", "Not at all"],
    awareIndex: 0,
  },
  {
    id: "witness",
    question: "Have you seen a road crash or a near-miss around your school?",
    options: ["Never", "Once", "A few times", "Very often"],
    awareIndex: 0,
  },
];

export function scoreSurvey(answers: Record<string, number>) {
  const total = surveyQuestions.length;
  let points = 0;
  for (const q of surveyQuestions) {
    const a = answers[q.id];
    if (a === undefined) continue;
    // 3 points for the most-aware option, decreasing for weaker answers.
    points += Math.max(0, 3 - Math.abs(a - q.awareIndex));
  }
  return Math.round((points / (total * 3)) * 100);
}

export const signCategories = ["Mandatory", "Warning", "Informational"] as const;
