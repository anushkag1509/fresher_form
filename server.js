const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const app = express();

const mongoURL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/hiring_db';
mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Define user schema and model
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Define applicant schema for form submissions
const applicantSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    qualification: String,
    skills: [String]
});

const Applicant = mongoose.model('Applicant', applicantSchema);

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true
}));

// Root route - redirect to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Registration route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error during registration.");
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send("No user found with this email.");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.user = user;
            res.redirect('/form');
        } else {
            res.status(400).send("Invalid credentials.");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Login error.");
    }
});

// Protected form route
app.get('/form', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Form submission route
app.post('/submit', async (req, res) => {
    const { name, email, phone, qualification, skills } = req.body;

    try {
        const applicant = new Applicant({ name, email, phone, qualification, skills });
        await applicant.save();
        res.send("Thank you for applying! We’ll be in touch.");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error submitting your application.");
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out.");
        }
        res.redirect('/login');
    });
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Start server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
