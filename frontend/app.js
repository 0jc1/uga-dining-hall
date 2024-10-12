// public/app.js

let URI = "https://uga-dining-hall.onrender.com:8000";

document.addEventListener('DOMContentLoaded', () => {
    const diningHalls = ['Bolton', 'The Village Summit', 'Oglethorpe', 'Snelling', 'The Niche'];
    const diningHallSelect = document.getElementById('diningHallSelect');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const statusDiv = document.getElementById('status');
    const ctx = document.getElementById('capacityChart').getContext('2d');
    let capacityChart;

    // Populate dining hall dropdown
    diningHalls.forEach((hall) => {
        const option = document.createElement('option');
        option.value = hall;
        option.textContent = hall;
        diningHallSelect.appendChild(option);
    });

    // Function to update the chart
    async function updateChart() {
        const hall = diningHallSelect.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (startTime) {
                params.append('startTime', new Date(startTime).toISOString());
            }
            if (endTime) {
                params.append('endTime', new Date(endTime).toISOString());
            }

            const url = `${URI}/api/capacity/${encodeURIComponent(hall)}?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!data || data.length === 0) {
                statusDiv.textContent = 'No data available for the selected time range.';
                // Destroy the existing chart if no data
                if (capacityChart) {
                    capacityChart?.destroy();
                }
                return;
            }

            const labels = data.map((item) => new Date(item.timestamp));
            const capacities = data.map((item) => item.availability);

            // Update status
            const latestDataPoint = data[data.length - 1];
            statusDiv.textContent = `Latest Availability at ${new Date(latestDataPoint.timestamp).toLocaleString()}:    ${latestDataPoint.availability}%`;

            // **Destroy existing chart before creating a new one**
            if (capacityChart) {
                capacityChart?.destroy();
            }

            // Create new chart
            capacityChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: `Availability of ${hall}`,
                            data: capacities,
                            fill: false,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.4,
                        },
                    ],
                },
                options: {
                  responsive: false,
                  adapters: {
                    type: 'time',
                  },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'minute',
                                tooltipFormat: 'MMM D, YYYY, h:mm:ss a',
                            },
                            title: { display: true, text: 'Time' },
                        },
                        y: {
                            title: { display: true, text: 'Availability' },
                            min: 0,
                            max: 100
                        },
                    },
                },
            });
        } catch (error) {
            console.log('Error fetching data:', error);
            statusDiv.textContent = 'Error fetching data.';
            // Destroy the existing chart if there's an error
            if (capacityChart) {
                capacityChart?.destroy();
            }
        }
    }

    // Event listeners
    diningHallSelect.addEventListener('change', updateChart);
    startTimeInput.addEventListener('change', updateChart);
    endTimeInput.addEventListener('change', updateChart);

    // Initial chart load
    updateChart();
});
