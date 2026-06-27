// Gear Train Calculator JavaScript

// --- Type Definitions ---

interface GearTrainInputs {
    inputSpeed: number;
    pinion1Teeth: number;
    gear1Teeth: number;
    pinion2Teeth: number | null;
    gear2Teeth: number | null;
    pressureAngle: number;
    helixAngle: number;
}

interface GearTrainResults {
    stage1Ratio: number;
    stage1OutputSpeed: number;
    pinion1PitchDiameter: number;
    gear1PitchDiameter: number;
    transversePressureAngle: number;
    centerDistance: number;
    overallRatio: number;
    finalOutputSpeed: number;
    torqueMultiplier: number;
    efficiency: number;
    stage2Ratio?: number;
    pinion2PitchDiameter?: number;
    gear2PitchDiameter?: number;
    centerDistance2?: number;
}

// --- Calculator Class ---

class GearTrainCalculator {
    private form: HTMLFormElement;
    private resultsDiv: HTMLDivElement;

    constructor() {
        this.form = document.getElementById('gearForm') as HTMLFormElement;
        this.resultsDiv = document.getElementById('results') as HTMLDivElement;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        try {
            const getInputValue = (id: string): number | null => {
                const el = document.getElementById(id) as HTMLInputElement;
                return el && el.value ? parseFloat(el.value) : null;
            };

            const inputSpeed = getInputValue('inputSpeed');
            const pinion1Teeth = getInputValue('pinion1Teeth');
            const gear1Teeth = getInputValue('gear1Teeth');
            const pinion2Teeth = getInputValue('pinion2Teeth');
            const gear2Teeth = getInputValue('gear2Teeth');
            const pressureAngle = getInputValue('pressureAngle');
            const helixAngle = getInputValue('helixAngle');

            if (inputSpeed === null || pinion1Teeth === null || gear1Teeth === null || pressureAngle === null || helixAngle === null || inputSpeed <= 0 || pinion1Teeth <= 0 || gear1Teeth <= 0 || pressureAngle < 0 || helixAngle < 0) {
                throw new Error('All required values must be positive numbers');
            }
            // Validate optional inputs if they are provided
            if ((pinion2Teeth !== null && pinion2Teeth <= 0) || (gear2Teeth !== null && gear2Teeth <= 0)) {
                throw new Error('Optional gear teeth values, if provided, must be positive numbers.');
            }

            // Credit spending
            if ((window as any).creditManager) {
                const user = (window as any).firebase.auth().currentUser;
                if (user) {
                    await (window as any).creditManager.deductCredit(user);
                } else {
                    throw new Error('Please login before calculating.');
                }
            }

            const inputs: GearTrainInputs = { inputSpeed, pinion1Teeth, gear1Teeth, pinion2Teeth, gear2Teeth, pressureAngle, helixAngle };
            const results = this.calculateGearTrain(inputs); 
            this.displayResults(results, inputs);
        } catch (error: any) {
            this.displayError(error.message || 'An unknown error occurred.');
        }
    }

    private calculateGearTrain(inputs: GearTrainInputs): GearTrainResults {
        const { inputSpeed, pinion1Teeth, gear1Teeth, pinion2Teeth, gear2Teeth, pressureAngle, helixAngle } = inputs;
        const results: Partial<GearTrainResults> = {};
    
        // First stage calculations
        const ratio1 = gear1Teeth / pinion1Teeth;
        results.stage1Ratio = ratio1;
        results.stage1OutputSpeed = inputSpeed / ratio1;
    
        // Pitch calculations (assuming diametral pitch of 20)
        const diametralPitch = 20;
        results.pinion1PitchDiameter = pinion1Teeth / diametralPitch;
        results.gear1PitchDiameter = gear1Teeth / diametralPitch;
    
        // Helical gear calculations
        const normalPressureAngleRad = pressureAngle * Math.PI / 180;
        const helixAngleRad = helixAngle * Math.PI / 180;
        const transversePressureAngleRad = Math.atan(Math.tan(normalPressureAngleRad) / Math.cos(helixAngleRad));
        results.transversePressureAngle = transversePressureAngleRad * 180 / Math.PI;
    
        // Center distance calculation (simplified)
        results.centerDistance = (results.pinion1PitchDiameter + results.gear1PitchDiameter) / 2;
    
        // Overall calculations
        if (pinion2Teeth !== null && gear2Teeth !== null) {
            const ratio2 = gear2Teeth / pinion2Teeth;
            results.stage2Ratio = ratio2;
            results.overallRatio = ratio1 * ratio2;
            results.pinion2PitchDiameter = pinion2Teeth / diametralPitch;
            results.gear2PitchDiameter = gear2Teeth / diametralPitch;
            results.centerDistance2 = (results.pinion2PitchDiameter + results.gear2PitchDiameter) / 2;
        } else {
            results.overallRatio = ratio1;
        }
        results.finalOutputSpeed = inputSpeed / results.overallRatio;
        results.torqueMultiplier = results.overallRatio;
    
        // Efficiency estimate (helical gears typically 98-99% per stage)
        const stageCount = (pinion2Teeth !== null && gear2Teeth !== null) ? 2 : 1;
        const efficiency = Math.pow(0.985, stageCount);
        results.efficiency = efficiency * 100;
    
        return results as GearTrainResults;
    }

    private displayResults(results: GearTrainResults, inputs: GearTrainInputs): void {
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

        if (results.stage2Ratio !== undefined && results.pinion2PitchDiameter !== undefined && results.gear2PitchDiameter !== undefined && results.centerDistance2 !== undefined) {
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

    private displayError(errorMessage: string): void {
        this.resultsDiv.innerHTML = '<div class="error">Error: ' + errorMessage + '</div>';
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GearTrainCalculator();
    console.log('Gear Train Calculator initialized');
});