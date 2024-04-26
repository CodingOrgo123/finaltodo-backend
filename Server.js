const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TodoModel = require("./Models/todolist");
const passport = require('passport');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bodyParser = require('body-parser');
require('dotenv').config(); // Load environment variables

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI; // MongoDB URI from .env

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(passport.initialize());
app.use(bodyParser.json());

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Routes for TodoList

app.get("/getTodoList", (req, res) => {
    TodoModel.find({})
        .then((todoList) => res.json(todoList))
        .catch((err) => res.status(500).json({ error: err.message }));
});

app.post("/addTodoList", (req, res) => {
    TodoModel.create({
        task: req.body.task,
        Description: req.body.Description,
        deadline: req.body.deadline,
        status: req.body.status,
    })
        .then((todo) => res.json(todo))
        .catch((err) => res.status(400).json({ error: err.message }));
});

app.post("/updateTodoList/:id", (req, res) => {
    const id = req.params.id;
    const updateData = {
        task: req.body.task,
        Description: req.body.Description,
        deadline: req.body.deadline,
        status: req.body.status,
    };
    TodoModel.findByIdAndUpdate(id, updateData)
        .then((todo) => res.json(todo))
        .catch((err) => res.status(400).json({ error: err.message }));
});

app.delete("/deleteTodoList/:id", (req, res) => {
    const id = req.params.id;
    TodoModel.findByIdAndDelete({ _id: id })
        .then((todo) => res.json(todo))
        .catch((err) => res.status(400).json({ error: err.message }));
});

// User Schema and Registration

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    cpassword: String,
});
const User = mongoose.model("User", userSchema);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const generateToken = () => {
    return crypto.randomBytes(20).toString('hex');
};

const tokenStore = {};

app.post('/logout', async (req, res) => {
    try {
        const { userEmail } = req.body;
        const deletedUser = await User.findOneAndDelete({ email: userEmail });
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User logged out and details deleted', deletedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post("/register", async (req, res) => {
    const { name, email, password, cpassword } = req.body;

    if (!name || !email || !password || !cpassword) {
        return res.status(422).json({ error: "Fill all the details" });
    }

    if (password !== cpassword) {
        return res.status(400).json({ error: "Password and Confirm Password do not match" });
    }

    try {
        const preuser = await User.findOne({ email: email });
        if (preuser) {
            return res.status(400).json({ error: "This Email is Already Exist" });
        }

        const finalUser = new User({ name, email, password, cpassword });
        await finalUser.save();

        return res.status(201).json({ message: "User registered successfully and Now you can login to your account", code: 201 });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        res.status(422).json({ error: "fill all the details" })
    }

    User.findOne({ email: req.body.email })
        .then(result => {
            if (result.password !== req.body.password) {
                res.send({ code: 404, message: 'password wrong' })
            } else {
                res.send({
                    username: result.name,
                    useremail: result.email,
                    code: 400,
                    message: 'User Login Successfully',
                })
            }
        })
        .catch(err => {
            res.send({ code: 500, message: 'user not found' })
        })
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
