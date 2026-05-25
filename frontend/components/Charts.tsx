"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { min: 0, max: 1, ticks: { callback: (value: string | number) => `${Number(value) * 100}%` } }
  }
};

export function MasteryChart({ mastery }: { mastery: Array<{ topic: string; mastery_score: number }> }) {
  const data = {
    labels: mastery.slice(0, 8).map((item) => item.topic),
    datasets: [
      {
        label: "Mastery",
        data: mastery.slice(0, 8).map((item) => item.mastery_score),
        backgroundColor: "#0f766e",
        borderRadius: 6
      }
    ]
  };
  return (
    <div className="h-72">
      <Bar options={options} data={data} />
    </div>
  );
}

export function AccuracyChart({ quizzes }: { quizzes: Array<{ topic: string; score: number }> }) {
  const data = {
    labels: quizzes.map((item, index) => `${index + 1}. ${item.topic}`),
    datasets: [
      {
        label: "Quiz accuracy",
        data: quizzes.map((item) => item.score),
        borderColor: "#e85d4f",
        backgroundColor: "rgba(232, 93, 79, 0.16)",
        fill: true,
        tension: 0.35
      }
    ]
  };
  return (
    <div className="h-72">
      <Line options={options} data={data} />
    </div>
  );
}
