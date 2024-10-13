let URI = "https://uga-dining-hall.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    const diningHalls = ['Bolton', 'The Village Summit', 'Oglethorpe', 'Snelling', 'The Niche'];
    const diningHallSelect = document.getElementById('diningHallSelect');
    let startTimeInput = document.getElementById('startTime');
    let endTimeInput = document.getElementById('endTime');
    const statusDiv = document.getElementById('status');
    const ctx = document.getElementById('capacityChart').getContext('2d');
    let capacityChart;

    diningHalls.forEach((hall) => {
        const option = document.createElement('option');
        option.value = hall;
        option.textContent = hall;
        diningHallSelect.appendChild(option);
    });

    // Function to parse datetime-local values into Date objects
    function parseDateTimeLocal(value) {
        if (!value) {
            return undefined;
        }
        // Split date and time parts if present
        const [datePart, timePart] = value.split('T');
        if (!datePart) {
            return undefined;
        }
        const [year, month, day] = datePart.split('-').map(Number);
    
        // Default time to midnight if time part is missing
        let hour = 0;
        let minute = 0;
    
        // If time part is present, parse it
        if (timePart) {
            [hour, minute] = timePart.split(':').map(Number);
        }
    
        return new Date(year, month - 1, day, hour, minute);
    }

    // Function to format Date objects for the API
    function formatDateForAPI(date) {
        if (!date) {
            return undefined;
        }
        return date.toISOString().split('.')[0]; // ISO string without milliseconds
    }

    // Function to update the chart
    async function updateChart() {
        const hall = diningHallSelect.value;
        const startTimeValue = startTimeInput.value;
        const endTimeValue = endTimeInput.value

        console.log(startTimeValue)

        try {
            // Parse input values into Date objects using the custom parser
            let startTime, endTime;
            if (startTimeValue) {
                startTime = parseDateTimeLocal(startTimeValue);
            }
            if (endTimeValue) {
                endTime = parseDateTimeLocal(endTimeValue);
            }

            console.log('Parsed Start Time:', startTime);
            console.log('Parsed End Time:', endTime);

            if (startTime > endTime) {
                statusDiv.textContent = "Error. Start time must come before the end time."
                if (capacityChart) {
                    capacityChart.destroy();
                }
                return;
            }

            // Build query parameters with correctly formatted dates
            const params = new URLSearchParams();
            if (startTime) {
                params.append('startTime', formatDateForAPI(startTime));
            }
            if (endTime) {
                params.append('endTime', formatDateForAPI(endTime));
            }

            // Build the URL
            let url = `${URI}/api/capacity/${encodeURIComponent(hall)}`;
            const paramsString = params.toString();
            if (paramsString) {
                url += `?${paramsString}`;
            }

            console.log('Request URL:', url);

            const response = await fetch(url);
            const data = await response.json();

            if (!data || data.length === 0) {
                statusDiv.textContent = 'No data available for the selected time range.';
                if (capacityChart) {
                    capacityChart.destroy();
                }
                return;
            }

            // Convert timestamps to Date objects for the labels
            const labels = data.map((item) => new Date(item.timestamp));
            const capacities = data.map((item) => item.availability);

            // Update status with the latest data point
            const latestDataPoint = data[data.length - 1];
            statusDiv.textContent = `Latest Availability at ${new Date(latestDataPoint.timestamp).toLocaleString()}: ${latestDataPoint.availability}%`;

            // Destroy existing chart if it exists
            if (capacityChart) {
                capacityChart.destroy();
            }

            // Create a new chart
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
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day',
                                tooltipFormat: 'MMM D, YYYY, h:mm a',
                                displayFormats: {
                                    'millisecond': 'MMM DD',
                                    'second': 'MMM DD',
                                    'minute': 'MMM DD',
                                    'hour': 'MMM DD',
                                    'day': 'MMM DD',
                                    'week': 'MMM DD',
                                    'month': 'MMM DD',
                                    'quarter': 'MMM DD',
                                    'year': 'MMM DD',
                                 }
                                 
                            },
                            gridLines: { display: false },
                            title: { display: true, text: 'Time' },
                            min: startTime ? startTime.getTime() : undefined,
                            max: endTime ? endTime.getTime() : undefined,
                        },
                        y: {
                            title: { display: true, text: 'Availability' },
                            min: 0,
                            max: 100,
                        },
                    },
                },
            });
        } catch (error) {
            console.log('Error fetching data:', error);
            statusDiv.textContent = 'Error fetching data.';
            if (capacityChart) {
                capacityChart.destroy();
            }
        }
    }

    // Event listeners
    diningHallSelect.addEventListener('change', updateChart);
    startTimeInput.addEventListener('input', () => {
        console.log('Start time input changed');
        updateChart();
    });
    endTimeInput.addEventListener('input', () => {
        console.log('End time input changed');
        updateChart();
    });

    // Initial chart load
    updateChart();
});
