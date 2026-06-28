let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase Auth Listener ---
    if (window.firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                // Assuming similar auth bar structure as other pages
                document.getElementById('user-display').textContent = `User: ${user.email}`;
                document.getElementById('auth-action-btn').textContent = 'Sign Out';
                try {
                    await window.creditManager.ensureUserCredits(user);
                } catch (error) {
                    console.error('Credit load error:', error);
                    window.creditManager.updateCreditsDisplay('Error');
                }
            } else {
                currentUser = null;
                window.location.href = 'HTML/login.html'; // Redirect if not authenticated
            }
        });
    } else {
        console.error("Firebase is not initialized.");
        document.querySelector('.container').innerHTML = "<h1>Error: Application services are unavailable.</h1>";
    }

    // Add other event listeners for your main calculator here
    // e.g., document.getElementById('calculateBtn').addEventListener('click', handleCalculation);

    // --- PDF Export Listener ---
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportPdf);
    }
});

function handleAuthAction() {
    if (currentUser) {
        firebase.auth().signOut();
    } else {
        window.location.href = 'HTML/login.html';
    }
}

// --- PDF Export ---
async function handleExportPdf() {
    const exportBtn = document.getElementById('exportPdfBtn');

    if (!currentUser) {
        alert('You must be logged in to export.');
        return;
    }

    // Confirmation Dialog
    const isConfirmed = confirm("This action will cost 5 credits. Are you sure you want to export to PDF?");
    if (!isConfirmed) {
        return; // User cancelled the action
    }

    exportBtn.disabled = true;
    exportBtn.classList.add('exporting');
    exportBtn.textContent = 'Exporting...';

    try {
        await window.creditManager.deductCredit(currentUser, 5);
        generatePdf();
    } catch (error) {
        alert(error.message || 'An error occurred while deducting credits for export.');
    } finally {
        resetExportButton(exportBtn);
    }
}

function generatePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const resultsContainer = document.getElementById('result'); // This is the main results div
    if (!resultsContainer || resultsContainer.classList.contains('hidden')) {
        alert('Please perform a calculation first.');
        return;
    }

    // --- PDF Content ---
    doc.setFontSize(18);
    doc.text('Helical Gear Setup Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Calculation Date: ${new Date().toLocaleDateString()}`, 14, 30);

    let y = 45;

    // --- Input Parameters ---
    // You will need to get these values from your input fields
    const desiredLead = document.getElementById('lead')?.value || 'N/A';
    const leadscrewPitch = document.getElementById('pitch')?.value || 'N/A';
    const dividingHeadRatio = document.getElementById('ratio')?.value || 'N/A';

    doc.setFontSize(12);
    doc.text('Input Parameters:', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`- Desired Helix Lead (L): ${desiredLead} mm`, 16, y); y += 6;
    doc.text(`- Leadscrew Pitch (P_L): ${leadscrewPitch} mm`, 16, y); y += 6;
    doc.text(`- Dividing Head Ratio (R_DH): ${dividingHeadRatio}`, 16, y); y += 12;

    // --- Calculation Results ---
    // You will need to get these values from your results display
    const machineConstant = document.getElementById('cm-output')?.textContent || 'N/A';
    const targetRatio = document.getElementById('target-ratio-output')?.textContent || 'N/A';

    doc.setFontSize(12);
    doc.text('Calculation Results:', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`- Machine Lead Constant (Cm): ${machineConstant}`, 16, y); y += 6;
    doc.text(`- Target Ratio (Rt): ${targetRatio}`, 16, y); y += 10;

    // --- Gear Setup ---
    // This part is highly dependent on how your results are structured in the HTML.
    // This is a sample implementation.
    const gearA = document.getElementById('gear-a')?.textContent || 'N/A';
    const gearB = document.getElementById('gear-b')?.textContent || 'N/A';
    const gearC = document.getElementById('gear-c')?.textContent || 'N/A';
    const gearD = document.getElementById('gear-d')?.textContent || 'N/A';
    const actualLead = document.getElementById('actual-lead-output')?.textContent || 'N/A';
    const errorPercent = document.getElementById('error-output')?.textContent || 'N/A';

    doc.setFontSize(12);
    doc.text('Recommended Gear Setup:', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`- Gear A (Driven 2): ${gearA}`, 16, y); y += 6;
    doc.text(`- Gear B (Driven 1): ${gearB}`, 16, y); y += 6;
    doc.text(`- Gear C (Driver 2): ${gearC}`, 16, y); y += 6;
    doc.text(`- Gear D (Driver 1): ${gearD}`, 16, y); y += 8;
    doc.text(`- Actual Lead: ${actualLead}`, 16, y); y += 6;
    doc.text(`- Error: ${errorPercent}`, 16, y); y += 6;

    doc.save('Helical-Gear-Setup-Report.pdf');
}

function resetExportButton(button) {
    if (button) {
        button.disabled = false;
        button.classList.remove('exporting');
        button.textContent = 'Export to PDF (5 Credits)';
    }
}
