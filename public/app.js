let statsChart;

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        if (data) {
            document.getElementById('totalTokensSaved').innerText = (data.totalTokensSaved || 0).toLocaleString();
            document.getElementById('avgTtft').innerText = (data.avgTtft || 0).toFixed(0);
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
    }
}

async function fetchLogs() {
    try {
        const res = await fetch('/api/logs?limit=50');
        const logs = await res.json();

        renderLogs(logs);
        updateChart(logs);
        updateContextMap(logs);
    } catch (err) {
        console.error("Error fetching logs:", err);
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logContainer');
    container.innerHTML = '';

    logs.forEach(log => {
        const div = document.createElement('div');
        const date = new Date(log.timestamp).toLocaleTimeString();

        let colorClass = 'log-success';
        if (log.type === 'error') colorClass = 'log-error';
        else if (log.tokensSaved > 0) colorClass = 'log-warn'; // Summarization triggered

        const msg = `[${date}] [${log.model}] ${log.message} - TTFT: ${Math.round(log.ttft)}ms | Total: ${Math.round(log.totalTime)}ms | Saved: ${log.tokensSaved}t`;

        div.className = colorClass;
        div.textContent = msg;
        container.appendChild(div);
    });
}

function updateChart(logs) {
    // Reverse for chronological order
    const sortedLogs = [...logs].reverse().filter(l => l.type === 'success');

    const labels = sortedLogs.map(l => new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}));
    const ttftData = sortedLogs.map(l => l.ttft);
    const savedData = sortedLogs.map(l => l.tokensSaved);

    if (statsChart) {
        statsChart.data.labels = labels;
        statsChart.data.datasets[0].data = ttftData;
        statsChart.data.datasets[1].data = savedData;
        statsChart.update();
    } else {
        const ctx = document.getElementById('statsChart').getContext('2d');
        statsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'TTFT (ms)',
                        data: ttftData,
                        borderColor: '#60a5fa', // blue-400
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Tokens Saved',
                        data: savedData,
                        borderColor: '#fbbf24', // amber-400
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                color: '#94a3b8',
                scales: {
                    x: {
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } }
                }
            }
        });
    }
}

function updateContextMap(logs) {
    const container = document.getElementById('contextMap');
    // Find the most recent successful log to represent the map
    const latestLog = logs.find(l => l.type === 'success');

    container.innerHTML = '';

    if (!latestLog) {
        container.innerHTML = '<div class="w-full bg-slate-700 rounded h-8 flex items-center px-3 text-xs text-slate-300">Waiting for requests...</div>';
        return;
    }

    if (latestLog.tokensSaved > 0) {
        // Summarized scenario
        container.innerHTML = `
            <div class="flex items-center text-xs text-slate-300 mb-1">Total Context Threshold Reached</div>
            <div class="flex w-full h-8 rounded overflow-hidden">
                <div class="bg-red-500 w-1/4 flex items-center justify-center text-xs font-bold text-white shadow-inner" title="Dropped Messages">Dropped</div>
                <div class="bg-yellow-500 w-1/4 flex items-center justify-center text-xs font-bold text-white shadow-inner" title="Summarized Context">Summarized</div>
                <div class="bg-blue-500 w-2/4 flex items-center justify-center text-xs font-bold text-white shadow-inner" title="Intact Recent Messages">Intact</div>
            </div>
            <div class="text-xs text-slate-400 mt-2">Saved ~${latestLog.tokensSaved} tokens.</div>
        `;
    } else {
        // Intact scenario
        container.innerHTML = `
            <div class="flex items-center text-xs text-slate-300 mb-1">Standard Context Window</div>
            <div class="flex w-full h-8 rounded overflow-hidden">
                <div class="bg-blue-500 w-full flex items-center justify-center text-xs font-bold text-white shadow-inner" title="Intact Messages">100% Intact</div>
            </div>
            <div class="text-xs text-slate-400 mt-2">No summarization required.</div>
        `;
    }
}

document.getElementById('refreshBtn').addEventListener('click', () => {
    fetchStats();
    fetchLogs();
});

// Auto-refresh every 5 seconds
setInterval(() => {
    fetchStats();
    fetchLogs();
}, 5000);

// Initial fetch
fetchStats();
fetchLogs();
