const STARTING_CREDITS = 100;
const CREDIT_GRANT_VERSION = 1;

function getLocalCreditsKey(user) {
    return `gearCredits:${user.uid}`;
}

function getLocalCredits(user) {
    const saved = localStorage.getItem(getLocalCreditsKey(user));
    let parsed = null;

    try {
        parsed = saved ? JSON.parse(saved) : null;
    } catch (error) {
        parsed = null;
    }

    if (!parsed || parsed.creditGrantVersion !== CREDIT_GRANT_VERSION) {
        const initialCredits = {
            credits: STARTING_CREDITS,
            creditGrantVersion: CREDIT_GRANT_VERSION
        };
        localStorage.setItem(getLocalCreditsKey(user), JSON.stringify(initialCredits));
        return STARTING_CREDITS;
    }

    const credits = Number(parsed.credits);
    return Number.isFinite(credits) ? credits : 0;
}

function setLocalCredits(user, credits) {
    localStorage.setItem(getLocalCreditsKey(user), JSON.stringify({
        credits,
        creditGrantVersion: CREDIT_GRANT_VERSION
    }));
    updateCreditsDisplay(credits);
    return credits;
}

function isFirestorePermissionError(error) {
    return error && (
        error.code === 'permission-denied' ||
        error.message === 'Missing or insufficient permissions.' ||
        String(error.message || '').includes('Missing or insufficient permissions')
    );
}

function getCreditsDb() {
    if (!window.firebase || !firebase.apps.length || !firebase.firestore) {
        throw new Error('Firebase Firestore is not ready.');
    }

    return firebase.firestore();
}

// Cache permission probe result: null = untested, true = ok, false = denied
let _firestorePermissionOk = null;

async function probeFirestorePermission(user) {
    if (_firestorePermissionOk !== null) {
        return _firestorePermissionOk;
    }
    try {
        const db = getCreditsDb();
        await db.collection('users').doc(user.uid).get();
        _firestorePermissionOk = true;
    } catch (error) {
        if (isFirestorePermissionError(error)) {
            _firestorePermissionOk = false;
        } else {
            throw error; // transient error, don't cache
        }
    }
    return _firestorePermissionOk;
}

async function ensureUserCredits(user) {
    if (!user) {
        return 0;
    }

    // Fast-path: if we already know Firestore is denied, use localStorage immediately
    if (_firestorePermissionOk === false) {
        const credits = getLocalCredits(user);
        updateCreditsDisplay(credits);
        return credits;
    }

    try {
        const db = getCreditsDb();
        const userRef = db.collection('users').doc(user.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            await userRef.set({
                email: user.email || '',
                credits: STARTING_CREDITS,
                creditGrantVersion: CREDIT_GRANT_VERSION,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            updateCreditsDisplay(STARTING_CREDITS);
            return STARTING_CREDITS;
        }

        const userData = userSnap.data();
        const savedCredits = Number(userData.credits || 0);

        if (userData.creditGrantVersion !== CREDIT_GRANT_VERSION) {
            await userRef.set({
                email: user.email || '',
                credits: STARTING_CREDITS,
                creditGrantVersion: CREDIT_GRANT_VERSION,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            updateCreditsDisplay(STARTING_CREDITS);
            return STARTING_CREDITS;
        }

        const credits = Number.isFinite(savedCredits) ? savedCredits : 0;
        updateCreditsDisplay(credits);
        return credits;
    } catch (error) {
        if (!isFirestorePermissionError(error)) {
            throw error;
        }

        const credits = getLocalCredits(user);
        updateCreditsDisplay(credits);
        return credits;
    }
}

async function spendCredit(user) {
    if (!user) {
        throw new Error('Please login before calculating.');
    }

    // Probe permission once; if denied skip the transaction entirely
    let permOk;
    try {
        permOk = await probeFirestorePermission(user);
    } catch (e) {
        permOk = false;
    }
    if (!permOk) {
        const currentCredits = getLocalCredits(user);
        if (currentCredits <= 0) {
            throw new Error('No credits remaining.');
        }
        return setLocalCredits(user, currentCredits - 1);
    }

    try {
        const db = getCreditsDb();
        const userRef = db.collection('users').doc(user.uid);

        const credits = await db.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(userRef);
            let currentCredits = STARTING_CREDITS;

            if (userSnap.exists) {
                currentCredits = Number(userSnap.data().credits || 0);
            }

            if (currentCredits <= 0) {
                throw new Error('No credits remaining.');
            }

            const nextCredits = currentCredits - 1;
            const updateData = {
                email: user.email || '',
                credits: nextCredits,
                creditGrantVersion: CREDIT_GRANT_VERSION,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!userSnap.exists) {
                updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            transaction.set(userRef, updateData, { merge: true });

            return nextCredits;
        });

        updateCreditsDisplay(credits);
        return credits;
    } catch (error) {
        if (!isFirestorePermissionError(error)) {
            throw error;
        }

        const currentCredits = getLocalCredits(user);

        if (currentCredits <= 0) {
            throw new Error('No credits remaining.');
        }

        return setLocalCredits(user, currentCredits - 1);
    }
}

async function addCredits(user, amount, paymentDetails = {}) {
    if (!user) {
        throw new Error('Please login before buying credits.');
    }

    const creditsToAdd = Number(amount);

    if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
        throw new Error('Invalid credit amount.');
    }

    // Probe permission once; if denied skip the transaction entirely
    let permOkAdd;
    try {
        permOkAdd = await probeFirestorePermission(user);
    } catch (e) {
        permOkAdd = false;
    }
    if (!permOkAdd) {
        const currentCredits = getLocalCredits(user);
        return setLocalCredits(user, currentCredits + creditsToAdd);
    }

    try {
        const db = getCreditsDb();
        const userRef = db.collection('users').doc(user.uid);

        const credits = await db.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(userRef);
            let currentCredits = STARTING_CREDITS;

            if (userSnap.exists) {
                currentCredits = Number(userSnap.data().credits || 0);
            }

            const nextCredits = currentCredits + creditsToAdd;
            const updateData = {
                email: user.email || '',
                credits: nextCredits,
                creditGrantVersion: CREDIT_GRANT_VERSION,
                lastPayment: paymentDetails,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!userSnap.exists) {
                updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            transaction.set(userRef, updateData, { merge: true });

            return nextCredits;
        });

        updateCreditsDisplay(credits);
        return credits;
    } catch (error) {
        if (!isFirestorePermissionError(error)) {
            throw error;
        }

        const currentCredits = getLocalCredits(user);
        return setLocalCredits(user, currentCredits + creditsToAdd);
    }
}

function updateCreditsDisplay(credits) {
    const safeCredits = Number.isFinite(Number(credits)) ? Number(credits) : 0;
    document.querySelectorAll('[data-credit-balance]').forEach((element) => {
        element.textContent = safeCredits;
    });
}

function showCreditError(message) {
    const messageText = message || 'Unable to update credits. Please try again.';
    const dedicatedError = document.getElementById('credit-error-message');

    if (dedicatedError) {
        dedicatedError.textContent = messageText;
        dedicatedError.classList.remove('hidden');
        dedicatedError.style.display = 'block';
        return;
    }

    alert(messageText);
}

window.creditManager = {
    STARTING_CREDITS,
    ensureUserCredits,
    deductCredit: spendCredit,
    addCredits,
    updateCreditsDisplay,
    showCreditError
};