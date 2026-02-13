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
countrySelect.addEventListener("change", updatePreview);
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
