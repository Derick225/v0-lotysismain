import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Enregistrer les composants nécessaires pour Chart.js
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function LotteryStatisticsChart(props: { data: any[] }) {
  // Préparer les données pour le graphique
  const chartData = {
    labels: props.data.map(entry => entry.date),
    datasets: [
      {
        label: 'Gagnants',
        data: props.data.map(entry => entry.winners_count),
        fill: false,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Statistiques des Tirages de Loterie',
      },
    },
  };

  return <Line data={chartData} options={chartOptions} />;
}
