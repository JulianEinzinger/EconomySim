const nameInput = document.getElementById("company-name");
const businessSelect = document.getElementById("business-type-select");
const countrySelect = document.getElementById("location-country-select");
const citySelect = document.getElementById("location-city-select");

const previewName = document.getElementById("preview-name");
const previewBusiness = document.getElementById("preview-business");
const previewCountry = document.getElementById("preview-country");
const previewCity = document.getElementById("preview-city");

function updatePreview() {
    previewName.textContent = nameInput.value || "Your Company Name";

    previewBusiness.textContent =
        businessSelect.options[businessSelect.selectedIndex]?.text || "–";

    previewCountry.textContent =
        countrySelect.options[countrySelect.selectedIndex]?.text || "–";

    previewCity.textContent =
        citySelect.options[citySelect.selectedIndex]?.text || "–";
}

// Event Listener
nameInput.addEventListener("input", updatePreview);
businessSelect.addEventListener("change", updatePreview);
citySelect.addEventListener("change", updatePreview);


const primaryColorInput = document.getElementById("primary-color");
const secondaryColorInput = document.getElementById("secondary-color");

const previewCard = document.querySelector(".preview-card");
const submitButton = document.querySelector("button[type='submit']");

const visualSection = document.querySelector(".visual-section");

function updateAccentColors() {
    const primary = primaryColorInput.value;
    const secondary = secondaryColorInput.value;

    const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;

    // Backgrounds setzen
    previewCard.style.background = gradient;
    visualSection.style.background = gradient;
    submitButton.style.background = gradient;

    previewCard.classList.add("dynamic-accent");

    // Durchschnittliche Helligkeit berechnen
    const avgBrightness =
        (getBrightness(primary) + getBrightness(secondary)) / 2;

    const textColor = avgBrightness > 160 ? "#111111" : "#ffffff";

    // Textfarbe anpassen
    visualSection.style.color = textColor;
    previewCard.style.color = textColor;
    submitButton.style.color = textColor;
}


// ===== Helper: Hex → Helligkeit berechnen =====
function getBrightness(hex) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);

    // Perceived brightness formula
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// Event Listener
primaryColorInput.addEventListener("input", updateAccentColors);
secondaryColorInput.addEventListener("input", updateAccentColors);

// Initial setzen
updateAccentColors();


// load countries + cities

async function loadCountries() {

    countrySelect.innerHTML = '';
    const countriesResult = await fetch("http://localhost:3000/locations/countries");

    if(countriesResult.ok) {
        (await countriesResult.json()).forEach(c => {
            const option = document.createElement("option");
            option.text = `${c.name} - ${c.countryCode}`
            option.value = c.countryCode;

            countrySelect.appendChild(option);
        });
        
    }
}

const cities = new Map();

async function loadCities() {
    citySelect.innerHTML = '';
    const citiesResult = await fetch(`http://localhost:3000/locations/cities`);

    if(citiesResult.ok) {
        (await citiesResult.json()).forEach(c => {
            if(!cities.has(c.countryCode)) {
                cities.set(c.countryCode, []);
            }
            cities.get(c.countryCode).push(c);
        });
    }
}

function updateCityOptions() {
    const selectedCountry = countrySelect.value;
    citySelect.innerHTML = '';

    if(cities.has(selectedCountry)) {
        cities.get(selectedCountry).forEach(city => {
            const option = document.createElement("option");
            option.text = city.name;
            option.value = `${city.name};${city.countryCode}`;

            citySelect.appendChild(option);
        });
    }

    updatePreview();
}

async function loadBusinessTypes() {
    businessSelect.innerHTML = '';
    const businessTypesResult = await fetch("http://localhost:3000/business/businessTypes");

    if(businessTypesResult.ok) {
        (await businessTypesResult.json()).forEach(bt => {
            const option = document.createElement("option");
            option.text = bt.name;
            option.value = bt.id;

            businessSelect.appendChild(option);
        });
    }
}

await loadCountries();
await loadCities();
await loadBusinessTypes();

updateCityOptions();

countrySelect.addEventListener("change", updateCityOptions);