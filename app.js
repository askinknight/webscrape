require('dotenv').config();
const express = require('express');
const serveIndex = require('serve-index');
const session = require("express-session");
const i18n = require("i18n-express");
const flash = require("connect-flash");
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const app = express();
const port = process.env.PORT || 8081;
const getRoleMap = require("./app/config/roleMap");
const db = require('./app/config/database');

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './app/views');
app.set('layout', 'layouts/layout');

// Middleware to serve static files
app.use(express.static('public'));

// Use serve-index to provide directory listing for the 'public/downloads' folder
app.use('/index-downloads', express.static('public/downloads'), serveIndex('public/downloads', { icons: true }));
app.use('/index-logs', express.static('logs'), serveIndex('logs', { icons: true }));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(expressLayouts);
app.use(flash());

app.use(i18n({
    translationsPath: path.join(__dirname, 'app/i18n'), 
    siteLangs: ["ar", "ch", "en", "fr", "ru", "it", "gr", "sp", "th"],
    textsVarName: 'translation'
})); 

// ตั้งค่า Session
app.use(session({
    name: "cookie",
    secret: "secretKey",
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 60 * 60 * 1000 
    }
}));


/*
app.use(async (req, res, next) => {
    if (!req.app.locals.roleMap || Object.keys(req.app.locals.roleMap).length === 0) {
        console.log("🔄 Reloading role map...");
        req.app.locals.roleMap = await getRoleMap(req.app);
    }
    try {
        const [rows] = await db.execute( // ใช้ pool ที่เชื่อมต่อกับ DB
            `SELECT 
                *,
                r.role_name as 'role'
            FROM users u
            JOIN roles r ON u.role_id = r.id WHERE username = ? AND password = ?`,
            ['admin', 'admin']
        );
        if (rows.length > 0) {
            req.session.user = rows[0]; // ตั้ง session ให้ผู้ใช้
        } else {
            console.log('หาไม่เจอ')
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
    next();
});
*/


    

// Example routes
const indexRoutes = require('./app/routes/index');
const configRoutes = require('./app/routes/config');
const dataRoutes = require('./app/routes/data');
const statusRoutes = require('./app/routes/status');
const downloadsRoutes = require('./app/routes/downloads');
const loadimagesRoutes = require('./app/routes/loadImage');
const scheduleRoutes = require('./app/routes/schedule');
const DBinsertRoutes = require('./app/routes/dbinsert');
const loginRouter = require('./app/routes/auth');
const userRouter = require('./app/routes/usermanagement');
const editRouter = require('./app/routes/editdashboard');
const docRouter = require('./app/routes/doc');


// Register routes
app.use('/', indexRoutes);
app.use('/config', configRoutes);
app.use('/data', dataRoutes);
app.use('/status', statusRoutes);
app.use('/downloads', downloadsRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/load-image', loadimagesRoutes);
app.use('/db-upload', DBinsertRoutes);
app.use('/auth', loginRouter);
app.use('/admin', userRouter);
app.use('/edit', editRouter);
app.use('/doc', docRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://10.1.136.121:${port}`);
});
