// Dashboard functionality
let paypalButtonsRendered = false;

const PAYPAL_CLIENT_ID = 'sb';
const CREDIT_PACKAGES = [
    { credits: 100, price: '5.00', containerId: 'paypal-credits-100' },
    { credits: 200, price: '10.00', containerId: 'paypal-credits-200' },
    { credits: 500, price: '25.00', containerId: 'paypal-credits-500' },
    { credits: 1000, price: '50.00', containerId: 'paypal-credits-1000' }
];

document.addEventListener('DOMContentLoaded', function() {
    setupDashboard();
    setupAuth();
});

function setupDashboard() {
    const aboutBtn = document.getElementById('aboutBtn');
    const guideBtn = document.getElementById('guideBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (aboutBtn) {
        aboutBtn.addEventListener('click', function() {
            window.location.href = 'about.html'; // Assumes it's in the same HTML folder
        });
    }

    if (guideBtn) {
        guideBtn.addEventListener('click', function() {
            window.location.href = 'guide.html'; // Assumes it's in the same HTML folder
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }

    console.log('Dashboard initialized');
}

function openCalculator(type) {
    if (type === 'helical') {
        window.location.href = '../index.html';
    } else if (type === 'gearTrain') {
        // Navigate to Gear Train Calculator
        window.location.href = 'Gear_Train_Calculator.html';
    }
}

function setupAuth() {
    if (!window.firebase || !firebase.auth) {
        console.error('Firebase Auth not available');
        return;
    }

    const auth = firebase.auth();

    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'login.html'; // Assumes it's in the same HTML folder
            return;
        }

        try {
            await window.creditManager.ensureUserCredits(user);
            setupPayPalCreditButtons(user);
        } catch (error) {
            console.error('Credit load error:', error);
        }
    });
}

function loadPayPalSdk() {
    if (window.paypal) {
        return Promise.resolve();
    }

    return new Promise(function(resolve, reject) {
        const existingScript = document.getElementById('paypalSdk');

        if (existingScript) {
            existingScript.addEventListener('load', resolve, { once: true });
            existingScript.addEventListener('error', reject, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = 'paypalSdk';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture`;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

async function setupPayPalCreditButtons(user) {
    if (paypalButtonsRendered) {
        return;
    }

    if (!window.creditManager || !window.creditManager.addCredits) {
        showPurchaseMessage('Credit manager is not ready. Please reload the page.', 'error');
        return;
    }

    try {
        await loadPayPalSdk();
    } catch (error) {
        showPurchaseMessage('PayPal could not load. Please check your connection and try again.', 'error');
        return;
    }

    CREDIT_PACKAGES.forEach(function(packageInfo) {
        const container = document.getElementById(packageInfo.containerId);

        if (!container || container.dataset.rendered === 'true') {
            return;
        }

        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                height: 38
            },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        description: `${packageInfo.credits} calculator credits`,
                        amount: {
                            currency_code: 'USD',
                            value: packageInfo.price
                        }
                    }]
                });
            },
            onApprove: async function(data, actions) {
                try {
                    const details = await actions.order.capture();
                    await window.creditManager.addCredits(user, packageInfo.credits, {
                        provider: 'paypal',
                        orderId: data.orderID,
                        payerEmail: details.payer && details.payer.email_address ? details.payer.email_address : '',
                        credits: packageInfo.credits,
                        amount: packageInfo.price,
                        currency: 'USD',
                        capturedAt: new Date().toISOString()
                    });
                    showPurchaseMessage(`${packageInfo.credits} credits added successfully.`, 'success');
                } catch (error) {
                    console.error('Payment credit error:', error);
                    showPurchaseMessage('Payment completed, but credits could not be added. Please contact support.', 'error');
                }
            },
            onCancel: function() {
                showPurchaseMessage('Payment cancelled.', 'error');
            },
            onError: function(error) {
                console.error('PayPal error:', error);
                showPurchaseMessage('PayPal payment failed. Please try again.', 'error');
            }
        }).render(`#${packageInfo.containerId}`);

        container.dataset.rendered = 'true';
    });

    paypalButtonsRendered = true;
}

function showPurchaseMessage(message, type) {
    const messageEl = document.getElementById('purchaseMessage');

    if (!messageEl) {
        alert(message);
        return;
    }

    messageEl.textContent = message;
    messageEl.className = `purchase-message ${type}`;
}

function logout() {
    if (window.firebase && firebase.auth) {
        firebase.auth().signOut().then(function() {
            window.location.href = 'login.html'; // Assumes it's in the same HTML folder
        }).catch(function(error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        });
        return;
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html'; // Assumes it's in the same HTML folder
}