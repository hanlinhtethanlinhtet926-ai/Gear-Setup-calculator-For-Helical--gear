// Central Firebase initialization for research pages
if (window.firebase && !firebase.apps.length) {
    const firebaseConfig = {
        apiKey: "AIzaSyClXxbktaVECewBsDsIbaSb4CoONz_vCgM",
        authDomain: "helical-gear-calculator.firebaseapp.com",
        projectId: "helical-gear-calculator",
        storageBucket: "helical-gear-calculator.firebasestorage.app",
        messagingSenderId: "749204425723",
        appId: "1:749204425723:web:0bcd0281916e8e4b20195e",
        measurementId: "G-VYVM24TPJN"
    };

    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        // ignore if already initialized
    }
}

// expose convenience reference
if (window.firebase) {
    try {
        window.firebaseAuth = firebase.auth();
        window.firebaseFirestore = firebase.firestore ? firebase.firestore() : null;
    } catch (e) {
        // noop
    }
}