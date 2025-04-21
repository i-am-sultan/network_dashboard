let dataTable;
let statsChartInstance;
let pieChartInstance;
let trendChartInstance;

function toggleDateInput() {
    const timeFilter = document.getElementById("timeFilter").value;
    const customDate = document.getElementById("customDateRange");
    customDate.style.display = (timeFilter === "Custom") ? "inline" : "none";
}

function loadLogs() {
    logInfo("Loading logs...");
    const ispFilter = document.getElementById("ispFilter").value;
    const timeFilter = document.getElementById("timeFilter").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    let url = `/get_logs?isp=${ispFilter}&timeframe=${timeFilter}`;
    if (timeFilter === "Custom" && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            logInfo("Logs received from server.");
            console.log("Received data:", data);  // 👈 log this
            displayLogs(data.logs);
            updateStats(data);
        })
        
        .catch(error => {
            logError("Error fetching logs: " + error);
        });
}

function displayLogs(logs) {
    console.log(logs);
    if (dataTable) {
        dataTable.destroy();
    }

    const tableBody = document.getElementById("logsTable").getElementsByTagName("tbody")[0];
    tableBody.innerHTML = "";

    logs.forEach(log => {
        const row = tableBody.insertRow();
        row.insertCell(0).innerHTML = log.ISP;
        row.insertCell(1).innerHTML = log.Downtime;
        row.insertCell(2).innerHTML = log.Uptime;
        row.insertCell(3).innerHTML = log.Difference;
    });
     
    console.log(logs.length);
    dataTable = $('#logsTable').DataTable();
    // document.getElementById("logWindow").innerHTML = logs.length + " log(s) displayed.";
    // logInfo(logs.length + " log(s) displayed.");
}

function updateStats(data) {
    stats = data.stats;
    trendData = data.trendData;


    let totalUptimeHours = stats.totalUptime;
    let totalDowntimeHours = stats.totalDowntime;  
    let outages = stats.outages;
    let availability = stats.availability;


    console.log("Total Uptime Hours:", totalUptimeHours);
    console.log("Total Downtime Hours:", totalDowntimeHours);
    console.log("Availability (%):", availability);
    console.log("Outages:", outages);

    document.getElementById("totalUptime").innerText = totalUptimeHours + " hours";
    document.getElementById("totalDowntime").innerText = totalDowntimeHours + " hours";
    document.getElementById("availability").innerText = availability + "%";
    document.getElementById("outages").innerText = outages;

    // Render chart
    renderChart(stats);
    renderPieChart(stats);
    renderTrendChart(trendData);
    

    logInfo("Stats updated successfully.");     
    console.log("Stats updated successfully.");
    console.log("Rendering chart with stats:", stats);  

}


function parseDurationToHours(durationStr) {
    // Handle cases like '1 days 02:30:00' or '00:45:00'
    let totalHours = 0;

    if (durationStr.includes("days")) {
        const parts = durationStr.split(" ");
        const days = parseInt(parts[0]);
        const timePart = parts[2];
        const [hours, minutes, seconds] = timePart.split(":").map(Number);

        totalHours += (days * 24) + hours + (minutes / 60) + (seconds / 3600);
    } else {
        const [hours, minutes, seconds] = durationStr.split(":").map(Number);
        totalHours += hours + (minutes / 60) + (seconds / 3600);
    }

    return totalHours;
}

// Logging helpers
function logInfo(message) {
    console.log("[INFO] " + message);
}

function logError(message) {
    console.error("[ERROR] " + message);
}
function printStatsReport() {
    const ispFilter = document.getElementById("ispFilter").value;
    const timeFilter = document.getElementById("timeFilter").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    // Get current stats
    const totalUptimeHours = document.getElementById("totalUptime").innerText;
    const totalDowntimeHours = document.getElementById("totalDowntime").innerText;
    const availability = document.getElementById("availability").innerText;
    const outages = document.getElementById("outages").innerText;

    // Build filter info string
    let filterInfo = `
        <tr><td><strong>ISP Filter</strong></td><td>${ispFilter}</td></tr>
        <tr><td><strong>Time Filter</strong></td><td>${timeFilter}</td></tr>
    `;
    
    if (timeFilter === "Custom") {
        filterInfo += `
            <tr><td><strong>Start Date</strong></td><td>${startDate}</td></tr>
            <tr><td><strong>End Date</strong></td><td>${endDate}</td></tr>
        `;
    }

    // Generate the report content
    const statsContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Network Stats Report</h2>
            <h3>Filters Applied</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <th style="background-color:#f0f0f0;">Filter</th>
                    <th style="background-color:#f0f0f0;">Value</th>
                </tr>
                ${filterInfo}
            </table>
            <h3>Stats Summary</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <th style="background-color:#f0f0f0;">Metric</th>
                    <th style="background-color:#f0f0f0;">Value</th>
                </tr>
                <tr>
                    <td>Total Uptime</td>
                    <td>${totalUptimeHours}</td>
                </tr>
                <tr>
                    <td>Total Downtime</td>
                    <td>${totalDowntimeHours}</td>
                </tr>
                <tr>
                    <td>Availability</td>
                    <td>${availability}</td>
                </tr>
                <tr>
                    <td>Outages</td>
                    <td>${outages}</td>
                </tr>
            </table>
            <p style="margin-top: 30px; font-size: 12px;">Generated by Network Dashboard | ${new Date().toLocaleString()}</p>
        </div>
    `;

    // Open new window and display the report
    const reportWindow = window.open("", "NetworkReport");
    reportWindow.document.write(`
        <html>
        <head>
            <title>Network Stats Report</title>
        </head>
        <body>${statsContent}</body>
        </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    reportWindow.close();
}


function downloadLogs() {
    const isp = document.getElementById('ispFilter').value;
    const timeframe = document.getElementById('timeFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let url = `/download_logs?isp=${isp}&timeframe=${timeframe}`;

    if (timeframe === "Custom") {
        url += `&start_date=${startDate}&end_date=${endDate}`;
    }

    // Trigger the download
    window.open(url, '_blank');
}


function renderChart(stats) {
    const ctx = document.getElementById('statsChart').getContext('2d');

    if (statsChartInstance) statsChartInstance.destroy();

    statsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Uptime', 'Total Downtime', 'Outages', 'Availability'],
            datasets: [{
                label: 'Hours / Count / %',
                data: [stats.totalUptime, stats.totalDowntime, stats.outages, stats.availability],
                backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#2196f3']
            }]
        },
        options: {
            plugins: { legend: { display: false }},
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    console.log("[INFO] Bar chart rendered with stats data.");
}

function renderPieChart(stats) {
    const ctx = document.getElementById('pieChart').getContext('2d');

    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Uptime %', 'Downtime %'],
            datasets: [{
                data: [stats.availability, 100 - stats.availability],
                backgroundColor: ['#4caf50', '#f44336'],
                borderWidth: 2
            }]
        },
        options: {
            cutout: '60%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(2)}%`;
                        }
                    }
                }
            },
            animation: { animateRotate: true }
        }
    });

    console.log("[INFO] Doughnut chart rendered with Uptime % and Downtime %.");
}


function renderTrendChart(trendData) {
    console.log("Trend data:", trendData);  // 👈 log this
    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,  // e.g. ['01-Apr', '02-Apr', '03-Apr']
            datasets: [
                {
                    label: 'Uptime (hrs)',
                    data: trendData.uptime,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Downtime (hrs)',
                    data: trendData.downtime,
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    console.log("[INFO] Trend line chart rendered.");
}



// Initialize when document is ready
$(document).ready(function() {
    loadLogs();
});
