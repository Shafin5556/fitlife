const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db"); 
const path = require("path"); 
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cookieParser = require('cookie-parser');

// Use cookie-parser middleware
app.use(cookieParser());

app.use(
  session({
    secret: "your_secret_key", // Replace with your own secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 86400000 }, // Use `secure: true` in production
  })
);

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html as the default page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// User Registration
app.post("/users/register", (req, res) => {
  const { first_name, last_name, email, phone, password, gender, age, plan } =
    req.body;

  // SQL query to insert the user data into the database
  const query = `
      INSERT INTO users (first_name, last_name, email, phone, password, gender, age, plan) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

  db.query(
    query,
    [first_name, last_name, email, phone, password, gender, age, plan], // No password hashing or validation
    (err, result) => {
      if (err) {
        console.error("Database error:", err); // Log the error to the console
        return res
          .status(500)
          .json({ error: "Failed to register user. " + err.message });
      }
      res.status(201).json({ message: "User registered successfully!" });
    }
  );
});

// ----------------------- ADMIN ROUTES -----------------------
// Admin Login
app.get("/admins/login", (req, res) => {
    // Check if the admin is already logged in using session or cookies
    if (req.session.adminId || req.cookies.adminId) {
      // Redirect to the dashboard if logged in
      return res.redirect("/dashboard");
    }
  
    // If not logged in, render the login page
    res.sendFile(path.join(__dirname, "public", "login.html"));
  });
  
// Admin Login Route (POST request)
// Admin login (POST request)
app.post("/admins/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required!" });
  }

  const query = "SELECT * FROM admins WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const admin = results[0];

    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Create a session for the admin
    req.session.adminId = admin.id;

    req.session.adminId = admin.id; // Store in session
    res.cookie('adminEmail', email, { maxAge: 86400000, httpOnly: true }); // Store email in cookies
    res.cookie('adminId', admin.id, { maxAge: 86400000, httpOnly: true }); // Store admin ID in cookies

    res
      .status(200)
      .json({ message: "Login successful. Welcome to the dashboard!" });
  });
});

app.get("/admins/create", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "create-admin.html"));
});

// Admin Create Route (POST request)
app.post("/admins/create", async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required!" });
  }

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
        INSERT INTO admins (email, password) 
        VALUES (?, ?)
      `;
    db.query(query, [email, hashedPassword], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Failed to create admin account." });
      }
      res.status(201).json({ message: "Admin account created successfully!" });
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during admin creation." });
  }
});


// Logout route to destroy session and cookies
// Logout route
app.get("/admins/logout", (req, res) => {
    // Destroy the session to log out the admin
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to log out" });
      }
  
      // Optionally, clear the cookie as well
      res.clearCookie("adminId");
  
      // Redirect to the login page after successful logout
      res.redirect("/");
    });
  });
  
// ----------------------- DASHBOARD ROUTES -----------------------
// Route to fetch all users (for the dashboard)
app.get("/users", (req, res) => {
  const query = "SELECT * FROM users";
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch users." });
    }
    res.json(results); // Send users as JSON response
  });
});

// Route to add a new user
app.post("/users/add", async (req, res) => {
  const { first_name, last_name, email, phone, password, gender, age, plan } =
    req.body;

  if (
    !first_name ||
    !last_name ||
    !email ||
    !phone ||
    !password ||
    !gender ||
    !age ||
    !plan
  ) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
        INSERT INTO users (first_name, last_name, email, phone, password, gender, age, plan) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
    db.query(
      query,
      [first_name, last_name, email, phone, hashedPassword, gender, age, plan],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Failed to add user." });
        }
        res.status(201).json({ message: "User added successfully!" });
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Server error during user creation." });
  }
});

// Route to delete a user
app.delete("/users/delete/:id", (req, res) => {
  const userId = req.params.id;

  // SQL query to delete the user by ID
  const query = "DELETE FROM users WHERE id = ?";
  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete user." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ message: "User deleted successfully." });
  });
});

// Fetch a single user by ID (for editing)
app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  const query = "SELECT * FROM users WHERE id = ?";
  db.query(query, [userId], (err, result) => {
    if (err) {
      res.status(500).json({ error: "Database query failed" });
    } else if (result.length > 0) {
      res.json(result[0]); // Send back the user data
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });
});

// Update user by ID
// Update an existing user (excluding password)
app.put("/users/update/:id", (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, phone, gender, age, plan } = req.body;

  // Validate the input (excluding password)
  if (
    !first_name ||
    !last_name ||
    !email ||
    !phone ||
    !gender ||
    !age ||
    !plan
  ) {
    return res
      .status(400)
      .json({ error: "All fields are required except password" });
  }

  const query =
    "UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, gender = ?, age = ?, plan = ? WHERE id = ?";
  db.query(
    query,
    [first_name, last_name, email, phone, gender, age, plan, userId],
    (err, result) => {
      if (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({ error: "Failed to update user" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: "User updated successfully" });
    }
  );
});

app.get("/dashboard", (req, res) => {

  
    // Check if the session or cookies contain the adminId
    const adminIdFromSession = req.session.adminId;
    const adminIdFromCookie = req.cookies.adminId;
  
    if (!adminIdFromSession && !adminIdFromCookie) {
      return res.redirect("/admins/login"); // Redirect to login if not logged in
    }
  
    // If logged in, proceed to the dashboard
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  });
  

// ----------------------- SERVER START -----------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
