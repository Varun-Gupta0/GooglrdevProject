import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import useEquiLens from '../store/useEquiLens';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GroupFairnessChart = () => {
  const { scorecard } = useEquiLens();

  const data = useMemo(() => {
    const labels = scorecard.group_fairness.map(g => g.name);
    const datasetData = scorecard.group_fairness.map(g => g.fairness);
    const bgColors = datasetData.map(v => 
      v >= 75 ? 'rgba(46, 216, 160, 0.8)' : 
      v >= 50 ? 'rgba(239, 159, 39, 0.8)' : 
      'rgba(226, 75, 74, 0.8)'
    );

    return {
      labels,
      datasets: [
        {
          label: 'Selection Rate %',
          data: datasetData,
          backgroundColor: bgColors,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
        },
      ],
    };
  }, [scorecard.group_fairness]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(7, 7, 14, 0.9)',
        titleColor: '#fff',
        bodyColor: '#a09aff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(200, 200, 224, 0.52)',
          font: { size: 10 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(200, 200, 224, 0.7)',
          font: { size: 11, weight: 'bold' },
        },
      },
    },
    animation: {
      duration: 600,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div style={{ height: '220px', width: '100%', marginTop: '8px' }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default GroupFairnessChart;
