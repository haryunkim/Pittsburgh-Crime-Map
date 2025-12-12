const map = L.map("map").setView([40.4406, -79.9959], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 30,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const SEVERITY_COLORS = {
  "Violent": "#d73027",  
  "Serious": "#fc8d59",   
  "Property": "#fee08b", 
  "Minor": "#91cf60"     
};
const crimeLayer = L.layerGroup().addTo(map);

const yearSelect = document.getElementById("selectYear");
const monthSelect = document.getElementById("selectMonth");

let crimeData = null;

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#filters input").forEach(cb => {
    cb.addEventListener("change", updateCrimes);
  });

  yearSelect.addEventListener("change", () => {
      updateMonths(crimeData, yearSelect.value);
    });

  monthSelect.addEventListener("change", () => {
    updateCrimes();
  })

  loadCrimeData();
});


async function loadCrimeData() {
  try {
    const response = await fetch("data/crime_data.json");
    crimeData = await response.json();

    populateYearMonth(crimeData);
    updateCrimes();

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

function updateCrimes() {
  const year = yearSelect.value;
  const month = monthSelect.value;

  crimeLayer.clearLayers();

  if (!crimeData[year] || !crimeData[year][month]) {
    return;
  }

  const activeSeverities = new Set(
    [...document.querySelectorAll("#filters input:checked")]
      .map(cb => cb.value)
  );

  const crimeInfo = crimeData[year][month];

  for (const crime of crimeInfo) {
    if (crime.lat == null || crime.lng == null) {
      continue;
    }

    if (!activeSeverities.has(crime.severity)) {
      continue;
    }

    const color = SEVERITY_COLORS[crime.severity] || "#999";

    const marker = L.circleMarker([crime.lat, crime.lng], {
      radius: 5,
      color: color,
      fillColor: color,
      fillOpacity: 0.7,
      weight: 1
    });

    marker.bindPopup(`
      <strong>${crime.type}</strong><br/>
      Category: ${crime.category}<br/>
      Severity: ${crime.severity}<br/>
      Neighborhood: ${crime.neighborhood}
    `);

    marker.addTo(crimeLayer);
  }
}

loadCrimeData();