const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your-secret-key'; // TODO: Bewaar dit veilig!

function generateToken(payload) {
    // Geen vervaldatum om de token altijd geldig te houden
    return jwt.sign(payload, SECRET_KEY);
}

function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (e) {
        return null;
    }
}

module.exports = { generateToken, verifyToken };
