const express = require("express");
const path = require("path");
const XLSX = require("xlsx");

const excelFile = path.join(__dirname, "database", "database.xlsx");

const app = express();
const PORT = process.env.PORT || 3000;

const workbook = XLSX.readFile(excelFile);

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

let tickets = [];
let customers = [];


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


/* CREATE TICKET */

app.post("/api/tickets", (req, res) => {

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Ticket"];

    const ticketsData = XLSX.utils.sheet_to_json(worksheet);

    const ticket = {
        "Ticket ID": "T-" + Date.now(),
        "Customer ID": req.body.customerId || "",
        "Customer Name": req.body.customerName,
        "Email": req.body.email,
        "Issue": req.body.issue,
        "Support Type": req.body.supportType,
        "Status": "Open",
        "Assigned Engineer": "",
        "Appointment Date": req.body.appointmentDate || "",
        "Appointment Time": req.body.appointmentTime || "",
        "Appointment Status": "Pending",
        "Created Date": new Date().toISOString(),
        "Service Result": ""
    };

    ticketsData.push(ticket);

    const newWorksheet =
        XLSX.utils.json_to_sheet(ticketsData);

    workbook.Sheets["Ticket"] = newWorksheet;

    XLSX.writeFile(workbook, excelFile);

    console.log("New ticket saved to Excel:", ticket);

    res.status(201).json({
        message: "Ticket created successfully",
        ticketId: ticket["Ticket ID"]
    });

});


/* GET CUSTOMER TICKETS */

app.get("/api/tickets", (req, res) => {

    const customerId = req.query.customerId;

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Ticket"];

    const ticketsData = XLSX.utils.sheet_to_json(worksheet);

    const customerTickets = ticketsData.filter(
        ticket => ticket["Customer ID"] === customerId
    );

    res.json(customerTickets);

});


/* CUSTOMER SIGN UP */

app.post("/api/customers/signup", (req, res) => {

    const { name, email, password } = req.body;

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Customer"];

    const customersData = XLSX.utils.sheet_to_json(worksheet);

    const existingCustomer = customersData.find(
        customer => customer.Email === email
    );

    if (existingCustomer) {

        return res.status(400).json({
            message: "An account with this email already exists."
        });

    }

    const customer = {
        "Customer ID": "C-" + Date.now(),
        "Name": name,
        "Email": email,
        "Password": password
    };

    customersData.push(customer);

    const newWorksheet =
        XLSX.utils.json_to_sheet(customersData);

    workbook.Sheets["Customer"] = newWorksheet;

    XLSX.writeFile(workbook, excelFile);

    console.log("New customer saved to Excel:", customer);

    res.status(201).json({
        message: "Account created successfully"
    });

});


/* CUSTOMER LOGIN */

app.post("/api/customers/login", (req, res) => {

    const { email, password } = req.body;

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Customer"];

    const customersData = XLSX.utils.sheet_to_json(worksheet);

    const customer = customersData.find(
        customer =>
            customer.Email === email &&
            customer.Password === password
    );

    if (!customer) {

        return res.status(401).json({
            message: "Invalid email or password."
        });

    }

    res.json({
        message: "Login successful",

        customer: {
            customerId: customer["Customer ID"],
            name: customer.Name,
            email: customer.Email
        }
    });

});


app.listen(PORT, "0.0.0.0", () => {

    console.log(`IT Ticketing System running on port ${PORT}`);

});

