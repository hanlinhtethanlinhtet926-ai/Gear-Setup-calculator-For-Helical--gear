let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase Auth Listener ---
    if (window.firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            const authBar = document.querySelector('.auth-bar');
            const userDisplay = document.getElementById('user-display');
            const authBtn = document.getElementById('auth-action-btn');

            if (user) {
                currentUser = user;
                authBar.style.display = 'flex';
                userDisplay.textContent = `User: ${user.email}`;
                authBtn.textContent = 'Sign Out';
                authBtn.style.backgroundColor = 'var(--error-color)';

                try {
                    await window.creditManager.ensureUserCredits(user);
                } catch (error) {
                    console.error('Credit load error:', error);
                    window.creditManager.updateCreditsDisplay('Error');
                }
            } else {
                currentUser = null;
                window.location.href = 'login.html'; // Redirect if not authenticated
            }
        });
    } else {
        console.error("Firebase is not initialized.");
        document.querySelector('.container').innerHTML = "<h1>Error: Application services are unavailable.</h1>";
    }

    // --- Form & Input Event Listeners ---
    document.getElementById('torqueForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('preset').addEventListener('change', applyPreset);
    document.querySelectorAll('input[name="unitSystem"]').forEach(radio => {
        radio.addEventListener('change', updateUnitLabels);
    });
    document.getElementById('exportPdfBtn').addEventListener('click', handleExportPdf);
    document.getElementById('threadCondition').addEventListener('change', (e) => {
        document.getElementById('customK').classList.toggle('hidden', e.target.value !== 'custom');
    });
});

// --- Auth Action ---
function handleAuthAction() {
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
    } else {
        window.location.href = 'login.html';
    }
}

// --- Form Submission Handler ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const calcButton = e.target.querySelector('.btn-calculate');
    const errorDiv = document.getElementById('credit-error-message');
    errorDiv.classList.add('hidden');
    calcButton.disabled = true;
    calcButton.textContent = 'Calculating...';

    if (!currentUser) {
        showError('You must be logged in to perform a calculation.');
        resetButton(calcButton);
        return;
    }

    try {
        await window.creditManager.deductCredit(currentUser);
        calculateTorque();
    } catch (error) {
        showError(error.message || 'An error occurred while deducting credits.');
    } finally {
        resetButton(calcButton);
    }
}

// --- Calculation Logic ---
function calculateTorque() {
    const unitSystem = document.querySelector('input[name="unitSystem"]:checked').value;
    const D = parseFloat(document.getElementById('diameter').value);
    const F = parseFloat(document.getElementById('preload').value);
    const threadCondition = document.getElementById('threadCondition').value;
    
    let K = parseFloat(threadCondition);
    if (threadCondition === 'custom') {
        K = parseFloat(document.getElementById('customK').value);
    }

    const resultsDiv = document.getElementById('results-content');
    resultsDiv.innerHTML = '';

    if (isNaN(D) || isNaN(F) || isNaN(K) || D <= 0 || F <= 0 || K <= 0) {
        resultsDiv.innerHTML = `<div class="error-message">Please fill in all fields with valid, positive numbers.</div>`;
        return;
    }

    let torque, torqueUnit, torqueAlt, torqueAltUnit;

    if (unitSystem === 'metric') {
        // D in mm, F in kN -> Torque in N·m
        torque = K * D * (F * 1000) / 1000; // Formula: T = K * D * F (with units aligned)
        torqueUnit = 'N·m';
        torqueAlt = torque * 0.73756; // Convert to ft-lbs
        torqueAltUnit = 'ft-lbs';
    } else {
        // D in inches, F in lbs -> Torque in in-lbs, converted to ft-lbs
        torque = (K * D * F) / 12; // Formula: T = K * D * F (result in ft-lbs)
        torqueUnit = 'ft-lbs';
        torqueAlt = torque / 0.73756; // Convert to N·m
        torqueAltUnit = 'N·m';
    }

    resultsDiv.appendChild(createResultItem('Recommended Torque', torque.toFixed(2), torqueUnit, `Approx. ${torqueAlt.toFixed(2)} ${torqueAltUnit}`));
    resultsDiv.appendChild(createResultItem('Input Preload', F.toFixed(2), unitSystem === 'metric' ? 'kN' : 'lbs'));

    // Animate results
    const resultItems = resultsDiv.querySelectorAll('.result-item');
    resultItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
    });

    // Show export button
    const exportBtn = document.getElementById('exportPdfBtn');
    exportBtn.style.display = 'block';
}

// --- UI Helper Functions ---

const PRESETS = {
    // Metric Class 8.8
    m6: { unit: 'metric', d: 6, f: 9.95 },
    m8: { unit: 'metric', d: 8, f: 17.9 },
    m10: { unit: 'metric', d: 10, f: 28.3 },
    m12: { unit: 'metric', d: 12, f: 38.2 },
    m16: { unit: 'metric', d: 16, f: 75.8 },
    // Imperial SAE Grade 5
    sae1_4: { unit: 'imperial', d: 0.25, f: 2425 },
    sae3_8: { unit: 'imperial', d: 0.375, f: 5750 },
    sae1_2: { unit: 'imperial', d: 0.5, f: 10400 },
    sae5_8: { unit: 'imperial', d: 0.625, f: 16500 },
    sae3_4: { unit: 'imperial', d: 0.75, f: 23700 },
};

function applyPreset() {
    const presetKey = document.getElementById('preset').value;
    if (!presetKey || !PRESETS[presetKey]) return;

    const preset = PRESETS[presetKey];
    document.querySelector(`input[name="unitSystem"][value="${preset.unit}"]`).checked = true;
    document.getElementById('diameter').value = preset.d;
    document.getElementById('preload').value = preset.f;
    updateUnitLabels();
}

function updateUnitLabels() {
    const isMetric = document.querySelector('input[name="unitSystem"]:checked').value === 'metric';
    document.querySelector('.unit-label-d').textContent = isMetric ? 'mm' : 'in';
    document.querySelector('.unit-label-f').textContent = isMetric ? 'kN' : 'lbs';
}

function showError(message) {
    const errorDiv = document.getElementById('credit-error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function resetButton(button) {
    button.disabled = false;
    button.textContent = 'Calculate Torque (1 Credit)';
}

/**
 * Creates a styled result item element.
 * @param {string} label - The label for the result.
 * @param {string} value - The calculated value.
 * @param {string} unit - The unit for the value.
 * @param {string} [secondaryText] - Optional secondary line of text.
 * @returns {HTMLElement}
 */
function createResultItem(label, value, unit, secondaryText = '') {
    const item = document.createElement('div');
    item.className = 'result-item';

    const labelEl = document.createElement('div');
    labelEl.className = 'result-label';
    labelEl.textContent = label;

    const valueContainer = document.createElement('div');

    const valueEl = document.createElement('span');
    valueEl.className = 'result-value';
    valueEl.textContent = value;

    const unitEl = document.createElement('span');
    unitEl.className = 'result-unit';
    unitEl.textContent = unit;

    valueContainer.appendChild(valueEl);
    valueContainer.appendChild(unitEl);

    item.appendChild(labelEl);
    item.appendChild(valueContainer);

    if (secondaryText) {
        const secondaryEl = document.createElement('div');
        secondaryEl.className = 'result-secondary';
        secondaryEl.textContent = secondaryText;
        item.appendChild(secondaryEl);
    }

    return item;
}

// --- PDF Export ---
async function handleExportPdf() {
    const exportBtn = document.getElementById('exportPdfBtn');
    exportBtn.disabled = true;
    exportBtn.classList.add('exporting');
    exportBtn.textContent = 'Exporting...';

    if (!currentUser) {
        showError('You must be logged in to export.');
        resetExportButton(exportBtn);
        return;
    }

    try {
        await window.creditManager.deductCredit(currentUser, 5);
        generatePdf();
        showError(''); // Clear any previous errors
    } catch (error) {
        showError(error.message || 'An error occurred while deducting credits for export.');
    } finally {
        resetExportButton(exportBtn);
    }
}

function generatePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const unitSystem = document.querySelector('input[name="unitSystem"]:checked').value;
    const D = document.getElementById('diameter').value;
    const F = document.getElementById('preload').value;
    const threadConditionEl = document.getElementById('threadCondition');
    const threadConditionText = threadConditionEl.options[threadConditionEl.selectedIndex].text;
    let K = threadConditionEl.value;
    if (K === 'custom') {
        K = document.getElementById('customK').value;
    }

    const resultsDiv = document.getElementById('results-content');
    if (!resultsDiv.children.length || resultsDiv.querySelector('.placeholder')) {
        alert('Please perform a calculation first.');
        return;
    }

    // --- PDF Content ---
    doc.setFontSize(18);
    doc.text('Bolt Torque Calculation Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Calculation Date: ${new Date().toLocaleDateString()}`, 14, 30);

    let y = 45;

    // Input Parameters
    doc.setFontSize(12);
    doc.text('Input Parameters:', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`- Unit System: ${unitSystem === 'metric' ? 'Metric' : 'Imperial'}`, 16, y); y += 6;
    doc.text(`- Bolt Diameter (D): ${D} ${unitSystem === 'metric' ? 'mm' : 'in'}`, 16, y); y += 6;
    doc.text(`- Target Preload (F): ${F} ${unitSystem === 'metric' ? 'kN' : 'lbs'}`, 16, y); y += 6;
    doc.text(`- Thread Condition: ${threadConditionText} (K=${K})`, 16, y); y += 12;

    // Results
    doc.setFontSize(12);
    doc.text('Calculation Results:', 14, y);
    y += 7;
    doc.setFontSize(10);
    const resultItems = resultsDiv.querySelectorAll('.result-item');
    resultItems.forEach(item => {
        const label = item.querySelector('.result-label').textContent;
        const value = item.querySelector('.result-value').textContent;
        const unit = item.querySelector('.result-unit').textContent;
        doc.text(`- ${label}: ${value} ${unit}`, 16, y); y += 6;
    });

    doc.save('Bolt-Torque-Report.pdf');
}

function resetExportButton(button) {
    button.disabled = false;
    button.classList.remove('exporting');
    button.textContent = 'Export to PDF (5 Credits)';
}
