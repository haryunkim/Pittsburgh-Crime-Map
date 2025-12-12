const map = L.map("map").setView([40.4406, -79.9959], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 30,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const yearSelect = document.getElementById("selectYear");
const monthSelect = document.getElementById("selectMonth");

async function loadCrimeData() {
  try {
    const response = await fetch("data/crime_data.json");
    const data = await response.json();

    populateYearMonth(data);

    yearSelect.addEventListener("change", () => {
      updateMonths(data, yearSelect.value);
    });

  } catch (error) {
    console.error("Error loading data:", error);
  }
}

function populateYearMonth(data) {
  yearSelect.innerHTML = "";

  const years = Object.keys(data).sort().reverse();
  if (years.length === 0) return;

  for (const year of years) {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    yearSelect.appendChild(option);
  }

  updateMonths(data, years[0]);
}

function updateMonths(data, selectedYear) {
  monthSelect.innerHTML = "";

  const monthsObj = data[selectedYear];
  if (!monthsObj) return;

  const months = Object.keys(monthsObj).sort().reverse();
  for (const month of months) {
    const option = document.createElement("option");
    option.value = month;
    option.text = month; // TODO: may change to the full month name
    monthSelect.appendChild(option);
  }
}

loadCrimeData();