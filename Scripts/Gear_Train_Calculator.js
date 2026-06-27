// Gear Train Calculator JavaScript

class GearTrainCalculator {
    constructor() {
        this.form = document.getElementById('gearForm');
        this.resultsDiv = document.getElementById('results');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        try {
            const inputSpeed = parseFloat(document.getElementById('inputSpeed').value);
            const pinion1Teeth = parseFloat(document.getElementById('pinion1Teeth').value);
            const gear1Teeth = parseFloat(document.getElementById('gear1Teeth').value);
            const pinion2Teeth = document.getElementById('pinion2Teeth').value ? parseFloat(document.getElementById('pinion2Teeth').value) : null;
            const gear2Teeth = document.getElementById('gear2Teeth').value ? parseFloat(document.getElementById('gear2Teeth').value) : null;
            const pressureAngle = parseFloat(document.getElementById('pressureAngle').value);
            const helixAngle = parseFloat(document.getElementById('helixAngle').value);

            if (inputSpeed <= 0 || pinion1Teeth <= 0 || gear1Teeth <= 0 || pressureAngle < 0 || helixAngle < 0) {
                throw new Error('All required values must be positive numbers');
            }
            // Validate optional inputs if they are provided
            if ((pinion2Teeth !== null && pinion2Teeth <= 0) || (gear2Teeth !== null && gear2Teeth <= 0)) {
                throw new Error('Optional gear teeth values, if provided, must be positive numbers.');
            }

            // Credit spending (auth/currentUser may be set by Gear_Train_Calculator.html)
            if (window.creditManager) {
                const user = firebase.auth().currentUser;
                if (user) {
                    await window.creditManager.deductCredit(user);
                } else {
                    throw new Error('Please login before calculating.');
                }
            }

            // Pass all raw input values to calculateGearTrain
            const results = this.calculateGearTrain(inputSpeed, pinion1Teeth, gear1Teeth, pinion2Teeth, gear2Teeth, pressureAngle, helixAngle); 
            this.displayResults(results, { inputSpeed, pinion1Teeth, gear1Teeth, pinion2Teeth, gear2Teeth, pressureAngle, helixAngle });
        } catch (error) {
            this.displayError(error.message);
        }
    }

    calculateGearTrain(inputSpeed, pinion1Teeth, gear1Teeth, pinion2Teeth, gear2Teeth, pressureAngle, helixAngle) {
        const results = {};
    
        // First stage calculations
        const ratio1 = gear1Teeth / pinion1Teeth;
        results.stage1Ratio = ratio1; // Keep as number
        results.stage1OutputSpeed = (inputSpeed / ratio1); // Keep as number
    
        // Pitch calculations (assuming diametral pitch of 20)
        const diametralPitch = 20;
        results.pinion1PitchDiameter = (pinion1Teeth / diametralPitch); // Keep as number
        results.gear1PitchDiameter = (gear1Teeth / diametralPitch); // Keep as number
    
        // Helical gear calculations
        const normalPressureAngleRad = pressureAngle * Math.PI / 180;
        const helixAngleRad = helixAngle * Math.PI / 180;
        const transversePressureAngleRad = Math.atan(Math.tan(normalPressureAngleRad) / Math.cos(helixAngleRad));
        results.transversePressureAngle = transversePressureAngleRad * 180 / Math.PI; // Keep as number
    
        // Center distance calculation (simplified)
        const pinion1Radius = (pinion1Teeth / diametralPitch) / 2;
        const gear1Radius = (gear1Teeth / diametralPitch) / 2;
        results.centerDistance = pinion1Radius + gear1Radius; // Keep as number
    
        // Overall calculations
        let overallRatioNumeric;
        if (pinion2Teeth && gear2Teeth) {
            const ratio2 = gear2Teeth / pinion2Teeth; // Keep as number
            results.stage2Ratio = ratio2;
            overallRatioNumeric = ratio1 * ratio2; // Keep as number
            results.overallRatio = overallRatioNumeric;
            results.finalOutputSpeed = (inputSpeed / overallRatioNumeric);
    
            results.pinion2PitchDiameter = (pinion2Teeth / diametralPitch); // Keep as number
            results.gear2PitchDiameter = (gear2Teeth / diametralPitch); // Keep as number
            results.centerDistance2 = (pinion2Teeth / diametralPitch) / 2 + (gear2Teeth / diametralPitch) / 2; // Keep as number
        } else {
            overallRatioNumeric = ratio1;
            results.overallRatio = overallRatioNumeric; // Keep as number
            results.finalOutputSpeed = (inputSpeed / overallRatioNumeric); // Keep as number
        }
    
        // Power transmission (assuming 1 kW input)
        results.torqueMultiplier = overallRatioNumeric; // Keep as number
    
        // Efficiency estimate (helical gears typically 98-99% per stage)
        const stageCount = (pinion2Teeth && gear2Teeth) ? 2 : 1;
        const efficiency = Math.pow(0.985, stageCount);
        results.efficiency = efficiency * 100; // Keep as number
    
        return results;
    }

    displayResults(results, inputs) {
        let html = '<div class="success">Calculation completed successfully!</div>';
        
        html += '<div class="result-item">';
        html += '<div class="result-label">Input Speed</div>';
        html += '<div class="result-value">' + inputs.inputSpeed.toFixed(2) + '<span class="result-unit">RPM</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Stage 1 Gear Ratio</div>';
        html += '<div class="result-value">' + results.stage1Ratio.toFixed(3) + '<span class="result-unit">:1</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Stage 1 Output Speed</div>';
        html += '<div class="result-value">' + results.stage1OutputSpeed.toFixed(2) + '<span class="result-unit">RPM</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Pinion 1 Pitch Diameter</div>';
        html += '<div class="result-value">' + results.pinion1PitchDiameter.toFixed(3) + '<span class="result-unit">in</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Gear 1 Pitch Diameter</div>';
        html += '<div class="result-value">' + results.gear1PitchDiameter.toFixed(3) + '<span class="result-unit">in</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Center Distance (Stage 1)</div>';
        html += '<div class="result-value">' + results.centerDistance.toFixed(3) + '<span class="result-unit">in</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Transverse Pressure Angle</div>';
        html += '<div class="result-value">' + results.transversePressureAngle.toFixed(2) + '<span class="result-unit">°</span></div>';
        html += '</div>';

        if (inputs.pinion2Teeth && inputs.gear2Teeth) {
            html += '<div class="result-item">';
            html += '<div class="result-label">Stage 2 Gear Ratio</div>';
            html += '<div class="result-value">' + results.stage2Ratio.toFixed(3) + '<span class="result-unit">:1</span></div>';
            html += '</div>';

            html += '<div class="result-item">';
            html += '<div class="result-label">Pinion 2 Pitch Diameter</div>';
            html += '<div class="result-value">' + results.pinion2PitchDiameter.toFixed(3) + '<span class="result-unit">in</span></div>';
            html += '</div>';

            html += '<div class="result-item">';
            html += '<div class="result-label">Gear 2 Pitch Diameter</div>';
            html += '<div class="result-value">' + results.gear2PitchDiameter.toFixed(3) + '<span class="result-unit">in</span></div>';
            html += '</div>';

            html += '<div class="result-item">';
            html += '<div class="result-label">Center Distance (Stage 2)</div>';
            html += '<div class="result-value">' + results.centerDistance2.toFixed(3) + '<span class="result-unit">in</span></div>';
            html += '</div>';
        }

        html += '<div class="result-item">';
        html += '<div class="result-label">Overall Gear Ratio</div>';
        html += '<div class="result-value">' + results.overallRatio.toFixed(3) + '<span class="result-unit">:1</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Final Output Speed</div>';
        html += '<div class="result-value">' + results.finalOutputSpeed.toFixed(2) + '<span class="result-unit">RPM</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">Torque Multiplier</div>';
        html += '<div class="result-value">' + results.torqueMultiplier.toFixed(3) + '<span class="result-unit">×</span></div>';
        html += '</div>';

        html += '<div class="result-item">';
        html += '<div class="result-label">System Efficiency</div>';
        html += '<div class="result-value">' + results.efficiency.toFixed(1) + '<span class="result-unit">%</span></div>';
        html += '</div>';

        this.resultsDiv.innerHTML = html;
    }

    displayError(errorMessage) {
        this.resultsDiv.innerHTML = '<div class="error">Error: ' + errorMessage + '</div>';
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new GearTrainCalculator();
    console.log('Gear Train Calculator initialized');
});