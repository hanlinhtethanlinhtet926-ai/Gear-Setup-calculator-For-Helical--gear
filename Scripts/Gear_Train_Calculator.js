document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;

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
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
            }
        });
    } else {
        console.error("Firebase is not initialized.");
        // Handle case where firebase is not available
        document.querySelector('.container').innerHTML = "<h1>Error: Application services are unavailable.</h1>";
    }

    // --- Form Submission ---
    const gearForm = document.getElementById('gearForm');
    gearForm.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateGearTrain();
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

// --- Calculation Logic ---
function calculateGearTrain() {
    const inputSpeed = parseFloat(document.getElementById('inputSpeed').value);
    const z1 = parseFloat(document.getElementById('pinion1Teeth').value);
    const z2 = parseFloat(document.getElementById('gear1Teeth').value);
    const z3 = parseFloat(document.getElementById('pinion2Teeth').value);
    const z4 = parseFloat(document.getElementById('gear2Teeth').value);

    const resultsDiv = document.getElementById('results-content');
    resultsDiv.innerHTML = ''; // Clear previous results

    if (isNaN(inputSpeed) || isNaN(z1) || isNaN(z2)) {
        resultsDiv.innerHTML = `<div class="error">Please fill in all required fields for Stage 1.</div>`;
        return;
    }

    // Stage 1 calculations
    const ratio1 = z2 / z1;
    const outputSpeed1 = inputSpeed / ratio1;

    let finalOutputSpeed = outputSpeed1;
    let overallRatio = ratio1;
    let efficiency = 0.985; // Efficiency for one stage

    // Display Stage 1 results
    resultsDiv.appendChild(createResultItem('Stage 1 Gear Ratio', ratio1.toFixed(3), ''));
    resultsDiv.appendChild(createResultItem('Stage 1 Output Speed', outputSpeed1.toFixed(2), 'RPM'));

    // Stage 2 calculations (if applicable)
    const isTwoStage = !isNaN(z3) && !isNaN(z4) && z3 > 0 && z4 > 0;
    if (isTwoStage) {
        const ratio2 = z4 / z3;
        const outputSpeed2 = outputSpeed1 / ratio2;

        finalOutputSpeed = outputSpeed2;
        overallRatio = ratio1 * ratio2;
        efficiency = 0.985 * 0.985; // Compounded efficiency

        resultsDiv.appendChild(createResultItem('Stage 2 Gear Ratio', ratio2.toFixed(3), ''));
        resultsDiv.appendChild(createResultItem('Stage 2 Output Speed', outputSpeed2.toFixed(2), 'RPM'));
    }

    // Final results
    const finalResultsHeader = document.createElement('h3');
    finalResultsHeader.textContent = 'Overall System Performance';
    finalResultsHeader.style.marginTop = '2rem';
    finalResultsHeader.style.borderTop = '1px solid var(--border-color)';
    finalResultsHeader.style.paddingTop = '1.5rem';
    resultsDiv.appendChild(finalResultsHeader);

    resultsDiv.appendChild(createResultItem('Overall Gear Ratio', overallRatio.toFixed(3), ''));
    resultsDiv.appendChild(createResultItem('Final Output Speed', finalOutputSpeed.toFixed(2), 'RPM'));
    resultsDiv.appendChild(createResultItem('Estimated Transmission Efficiency', (efficiency * 100).toFixed(2), '%'));

    // Animate results
    const resultItems = resultsDiv.querySelectorAll('.result-item');
    resultItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.07}s`;
    });
}

// --- UI Helper Function ---
/**
 * Creates a styled result item element.
 * @param {string} label - The label for the result.
 * @param {string} value - The calculated value.
 * @param {string} unit - The unit for the value.
 * @returns {HTMLElement} - The created result item div.
 */
function createResultItem(label, value, unit) {
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

    return item;
}
