// Initialize map
const map = L.map("map").setView([40.4406, -79.9959], 12);

// Add basemap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 30,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const yearSelect = document.getElementById("select-year");
const monthSelect = document.getElementById("select-month");

fetch("data/monthly_crime.json")
    .then(response => response.json())
    .then(data => {
        populateYearDropdown(data);
    })
    .catch(error => console.error("Error loading data:", error));

function populateYearDropdown(data) {
    const years = Object.keys(data).sort().reverse();
    years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.text = year;
        yearSelect.appendChild(option);
    });

    populateMonthDropdown(data, years[0]);

    yearSelect.addEventListener("change", () => {
        monthSelect.innerHTML = "";
        populateMonthDropdown(data, yearSelect.value);
    });
}

function populateMonthDropdown(data, selectedYear) {
    const months = Object.keys(data[selectedYear]).sort().reverse();
    months.forEach(month => {
        const option = document.createElement("option");
        option.value = month;
        option.text = month;
        monthSelect.appendChild(option);
    });
}
