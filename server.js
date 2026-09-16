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

/* GET TICKETS */

app.get("/api/tickets", (req, res) => {


const customerId = req.query.customerId;

const workbook = XLSX.readFile(excelFile);

const worksheet = workbook.Sheets["Ticket"];

const ticketsData = XLSX.utils.sheet_to_json(worksheet);


/* CUSTOMER VIEW */

if (customerId) {

    const customerTickets = ticketsData.filter(
        ticket => ticket["Customer ID"] === customerId
    );

    return res.json(customerTickets);

}


/* IT STAFF VIEW */

res.json(ticketsData);


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

/* STAFF LOGIN */

app.post("/api/staff/login", (req, res) => {


const { email, password } = req.body;

const workbook = XLSX.readFile(excelFile);

const worksheet = workbook.Sheets["Staff"];

const staffData = XLSX.utils.sheet_to_json(worksheet);

const staff = staffData.find(
    staff =>
        staff.Email === email &&
        staff.Password === password
);

if (!staff) {

    return res.status(401).json({
        message: "Invalid email or password."
    });

}

res.json({
    message: "Login successful",

    staff: {
        staffId: staff["Staff ID"],
        name: staff.Name,
        email: staff.Email,
        role: staff.Role,
        department: staff.Department
    }
});

});

/* GET SINGLE TICKET */

app.get("/api/tickets/:ticketId", (req, res) => {

    const ticketId = req.params.ticketId;

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Ticket"];

    const ticketsData = XLSX.utils.sheet_to_json(worksheet);

    const ticket = ticketsData.find(
        ticket => ticket["Ticket ID"] === ticketId
    );

    if (!ticket) {

        return res.status(404).json({
            message: "Ticket not found."
        });

    }

    res.json(ticket);

});

/* UPDATE TICKET */
/* SUBMIT SEPARATE SERVICE REPORT */
app.post("/api/tickets/:ticketId/service-report", (req, res) => {
  const ticketId = req.params.ticketId;
  const { onsite, engineer, date, signInTime, signOutTime, tasksDone, resolution } = req.body;

  const workbook = XLSX.readFile(excelFile);

  // 1. Get or initialize the ServiceReport sheet
  let reportsData = [];
  if (workbook.Sheets["ServiceReport"]) {
    reportsData = XLSX.utils.sheet_to_json(workbook.Sheets["ServiceReport"]);
  }

  // 2. Locate the ticket to copy customer details and update its status
  const ticketSheet = workbook.Sheets["Ticket"];
  const ticketsData = XLSX.utils.sheet_to_json(ticketSheet);
  const ticketIndex = ticketsData.findIndex((t) => t["Ticket ID"] === ticketId);

  if (ticketIndex === -1) {
    return res.status(404).json({ message: "Ticket not found." });
  }

  const ticket = ticketsData[ticketIndex];

  // 3. Compute duration for record-keeping
  let hoursSpent = 0;
  if (signInTime && signOutTime) {
    const start = new Date(`1970-01-01T${signInTime}:00`);
    const end = new Date(`1970-01-01T${signOutTime}:00`);
    const diffMs = end - start;
    if (diffMs > 0) {
      hoursSpent = +(diffMs / (1000 * 60 * 60)).toFixed(2);
    }
  }

  // 4. Create new report record
  const newReport = {
    "Report ID": "SR-" + Date.now(),
    "Ticket ID": ticket["Ticket ID"],
    "Customer ID": ticket["Customer ID"] || "",
    "Customer Name": ticket["Customer Name"] || "",
    "Engineer": engineer || ticket["Assigned Engineer"] || "",
    "Onsite": onsite ? "Yes" : "No",
    "Date": date || new Date().toISOString().split("T")[0],
    "SignInTime": signInTime || "",
    "SignOutTime": signOutTime || "",
    "HoursSpent": hoursSpent,
    "TasksDone": tasksDone || "",
    "Resolution": resolution || "",
    "Created At": new Date().toISOString()
  };

  reportsData.push(newReport);

  // 5. Update ticket status to Closed & record resolution outcome
  ticketsData[ticketIndex]["Status"] = "Closed";
  ticketsData[ticketIndex]["Service Result"] = resolution || "";
  if (engineer) {
    ticketsData[ticketIndex]["Assigned Engineer"] = engineer;
  }

  // 6. Save back to workbook
  workbook.Sheets["ServiceReport"] = XLSX.utils.json_to_sheet(reportsData);
  workbook.Sheets["Ticket"] = XLSX.utils.json_to_sheet(ticketsData);
  XLSX.writeFile(workbook, excelFile);

  res.status(201).json({
    message: "Service report generated and saved successfully.",
    report: newReport
  });
});

/* GET SERVICE REPORT(S) FOR A TICKET */
app.get("/api/tickets/:ticketId/service-reports", (req, res) => {
  const ticketId = req.params.ticketId;
  const workbook = XLSX.readFile(excelFile);

  // Return an empty list if the sheet hasn't been created yet
  if (!workbook.Sheets["ServiceReport"]) {
    return res.json([]);
  }

  const reportsData = XLSX.utils.sheet_to_json(workbook.Sheets["ServiceReport"]);

  // Filter all reports matching the given Ticket ID
  const ticketReports = reportsData.filter(
    (report) => report["Ticket ID"] === ticketId
  );

  res.json(ticketReports);
});

app.put("/api/tickets/:ticketId", (req, res) => {

    const ticketId = req.params.ticketId;

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Ticket"];

    const ticketsData = XLSX.utils.sheet_to_json(worksheet);


    // Find the ticket
    const ticketIndex = ticketsData.findIndex(
        ticket => ticket["Ticket ID"] === ticketId
    );


    // Ticket not found
    if (ticketIndex === -1) {

        return res.status(404).json({
            message: "Ticket not found."
        });

    }


    // Update the ticket
    ticketsData[ticketIndex]["Assigned Engineer"] =
        req.body.assignedEngineer || "";

    ticketsData[ticketIndex]["Status"] =
        req.body.status || "Open";

    ticketsData[ticketIndex]["Appointment Status"] =
        req.body.appointmentStatus || "Pending";

    ticketsData[ticketIndex]["Service Result"] =
        req.body.serviceResult || "";


    // Convert updated data back to Excel
    const newWorksheet =
        XLSX.utils.json_to_sheet(ticketsData);

    workbook.Sheets["Ticket"] = newWorksheet;


    // Save Excel file
    XLSX.writeFile(workbook, excelFile);


    console.log("Ticket updated:", ticketId);


    res.json({
        message: "Ticket updated successfully."
    });

});

/* GET STAFF */

app.get("/api/staff", (req, res) => {

    const workbook = XLSX.readFile(excelFile);

    const worksheet = workbook.Sheets["Staff"];

    const staffData = XLSX.utils.sheet_to_json(worksheet);

    const staffList = staffData.map(staff => ({
        staffId: staff["Staff ID"],
        name: staff.Name,
        email: staff.Email,
        role: staff.Role,
        department: staff.Department
    }));

    res.json(staffList);

});

app.listen(PORT, "0.0.0.0", () => {


console.log(`IT Ticketing System running on port ${PORT}`);


});
