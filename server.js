const express = require("express");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;

const excelDir = path.join(
    __dirname,
    "Database"
);

const excelFile = path.join(
    excelDir,
    "database.xlsx"
);

const lockFile = path.join(
    excelDir,
    "database.xlsx.lock"
);

const LOCK_TIMEOUT_MS = 30000;

function acquireWorkbookLock() {
    try {
        if (fs.existsSync(lockFile)) {
            const lockInfo = fs.readFileSync(lockFile, "utf8");
            const lockAge = Date.now() - fs.statSync(lockFile).mtimeMs;

            if (lockAge > LOCK_TIMEOUT_MS) {
                fs.unlinkSync(lockFile);
            } else {
                const lockError = new Error(
                    "Another save is already in progress. Please wait a moment and try again."
                );
                lockError.code = "DATABASE_LOCKED";
                throw lockError;
            }
        }

        fs.writeFileSync(
            lockFile,
            JSON.stringify({
                pid: process.pid,
                timestamp: Date.now()
            }),
            { flag: "wx" }
        );

    } catch (error) {
        if (error && error.code === "EEXIST") {
            const lockError = new Error(
                "Another save is already in progress. Please wait a moment and try again."
            );
            lockError.code = "DATABASE_LOCKED";
            throw lockError;
        }

        if (error && error.code === "DATABASE_LOCKED") {
            throw error;
        }

        throw error;
    }
}

function releaseWorkbookLock() {
    try {
        if (fs.existsSync(lockFile)) {
            fs.unlinkSync(lockFile);
        }
    } catch (_) {}
}

function writeWorkbook(workbook) {
    acquireWorkbookLock();

    const tempWorkbookPath = path.join(
        excelDir,
        `database-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp.xlsx`
    );

    try {
        XLSX.writeFile(workbook, tempWorkbookPath);

        try {
            fs.copyFileSync(tempWorkbookPath, excelFile);
        } catch (error) {
            const message = String(error && error.message ? error.message : error);
            const isLocked =
                error && (
                    error.code === "EACCES" ||
                    error.code === "EPERM" ||
                    /locked|permission|access/i.test(message)
                );

            if (isLocked) {
                const lockError = new Error(
                    "The Excel database is currently locked. Please close the workbook in Excel and try again."
                );
                lockError.code = "DATABASE_LOCKED";
                throw lockError;
            }

            throw error;
        }
    } finally {
        try {
            if (fs.existsSync(tempWorkbookPath)) {
                fs.unlinkSync(tempWorkbookPath);
            }
        } catch (_) {}

        releaseWorkbookLock();
    }

    return true;
}

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


/* =========================================================
   CUSTOMER SIGN UP
========================================================= */

app.post("/api/customers/signup", (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        if (!name || !email || !password) {

            return res.status(400).json({
                message: "Please fill in all fields."
            });

        }


        const workbook =
            XLSX.readFile(excelFile);

        const worksheet =
            workbook.Sheets["Customer"];


        if (!worksheet) {

            return res.status(500).json({
                message: "Customer sheet not found."
            });

        }


        const customersData =
            XLSX.utils.sheet_to_json(
                worksheet
            );


        const existingCustomer =
            customersData.find(
                customer =>
                    String(
                        customer.Email || ""
                    ).trim().toLowerCase() ===
                    String(email)
                        .trim()
                        .toLowerCase()
            );


        if (existingCustomer) {

            return res.status(400).json({

                message:
                    "An account with this email already exists."

            });

        }


        const customer = {

            "Customer ID":
                "C-" + Date.now(),

            "Name":
                name,

            "Email":
                email,

            "Password":
                password,

            "Credits":
                0

        };


        customersData.push(customer);


        workbook.Sheets["Customer"] =
            XLSX.utils.json_to_sheet(
                customersData
            );


        writeWorkbook(workbook);

        console.log(
            "New customer saved to Excel:",
            customer
        );


        res.status(201).json({

            message:
                "Account created successfully."

        });

    } catch (error) {

        console.error(
            "Customer signup error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to create customer account."

        });

    }

});


/* =========================================================
   CUSTOMER LOGIN
========================================================= */

app.post("/api/customers/login", (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                message:
                    "Please enter your email and password."

            });

        }


        const workbook =
            XLSX.readFile(excelFile);

        const worksheet =
            workbook.Sheets["Customer"];


        if (!worksheet) {

            return res.status(500).json({

                message:
                    "Customer sheet not found."

            });

        }


        const customersData =
            XLSX.utils.sheet_to_json(
                worksheet
            );


        const customer =
            customersData.find(
                customer =>
                    String(
                        customer.Email || ""
                    ).trim().toLowerCase() ===
                    String(email)
                        .trim()
                        .toLowerCase() &&
                    String(
                        customer.Password || ""
                    ) ===
                    String(password)
            );


        if (!customer) {

            return res.status(401).json({

                message:
                    "Invalid email or password."

            });

        }


        res.json({

            message:
                "Login successful.",

            customer: {

                customerId:
                    customer["Customer ID"],

                name:
                    customer.Name,

                email:
                    customer.Email,

                credits:
                    Number(
                        customer["Credits"] || 0
                    )

            }

        });

    } catch (error) {

        console.error(
            "Customer login error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to process customer login."

        });

    }

});


/* =========================================================
   STAFF LOGIN
========================================================= */

app.post("/api/staff/login", (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                message:
                    "Please enter your email and password."

            });

        }


        const workbook =
            XLSX.readFile(excelFile);

        const worksheet =
            workbook.Sheets["Staff"];


        if (!worksheet) {

            return res.status(500).json({

                message:
                    "Staff sheet not found in database.xlsx."

            });

        }


        const staffData =
            XLSX.utils.sheet_to_json(
                worksheet
            );


        console.log(
            "Staff login attempt:",
            email
        );


        const staff =
            staffData.find(
                staff => {

                    const staffEmail =
                        String(
                            staff.Email || ""
                        )
                        .trim()
                        .toLowerCase();


                    const enteredEmail =
                        String(email)
                        .trim()
                        .toLowerCase();


                    const staffPassword =
                        String(
                            staff.Password || ""
                        );


                    const enteredPassword =
                        String(password);


                    return (
                        staffEmail === enteredEmail &&
                        staffPassword === enteredPassword
                    );

                }
            );


        if (!staff) {

            console.log(
                "Staff login failed for:",
                email
            );

            return res.status(401).json({

                message:
                    "Invalid email or password."

            });

        }


        console.log(
            "Staff login successful:",
            staff.Email
        );


        res.json({

            message:
                "Login successful.",

            staff: {

                staffId:
                    staff["Staff ID"],

                name:
                    staff.Name,

                email:
                    staff.Email,

                role:
                    staff.Role,

                department:
                    staff.Department

            }

        });

    } catch (error) {

        console.error(
            "Staff login error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to process staff login."

        });

    }

});


/* =========================================================
   CREATE TICKET
========================================================= */

app.post("/api/tickets", (req, res) => {

    try {

        const workbook =
            XLSX.readFile(excelFile);


        /* =========================
           GET CUSTOMER DATA
        ========================= */

        const customerWorksheet =
            workbook.Sheets["Customer"];


        if (!customerWorksheet) {

            return res.status(500).json({

                message:
                    "Customer sheet not found."

            });

        }


        const customersData =
            XLSX.utils.sheet_to_json(
                customerWorksheet
            );


        /* =========================
           FIND CUSTOMER
        ========================= */

        const customerIndex =
            customersData.findIndex(
                customer =>
                    customer["Customer ID"] ===
                    req.body.customerId
            );


        /*
           CUSTOMER ID IS OPTIONAL FOR
           STAFF-CREATED TICKETS.

           If a customer ID is provided,
           we will find the customer and
           handle credits.

           If no customer ID is provided,
           the ticket can still be created
           using the manually entered
           customer name and email.
        */

        let customer = null;


        if (req.body.customerId) {

            if (customerIndex === -1) {

                return res.status(404).json({

                    message:
                        "Customer not found."

                });

            }


            customer =
                customersData[customerIndex];

        }


        /* =========================
           GET APPOINTMENT DURATION
        ========================= */

        let appointmentDuration = null;
        const onSiteSupportType =
            String(
                req.body.onSiteSupportType || ""
            ).trim();


        if (
            req.body.supportType ===
            "On-site Support"
        ) {

            if (!onSiteSupportType) {

                return res.status(400).json({

                    message:
                        "Please select an on-site support type."

                });

            }

            let minimumHours = 0;

            if (onSiteSupportType === "Maintenance") {
                minimumHours = 1;
            } else if (onSiteSupportType === "TEMP") {
                minimumHours = 2;
            } else if (onSiteSupportType === "Project") {
                // TODO: confirm the official project minimum with the supervisor.
                minimumHours = 6;
            } else {
                return res.status(400).json({

                    message:
                        "Invalid on-site support type selected."

                });
            }

            appointmentDuration =
                parseFloat(
                    req.body.appointmentDuration
                );


            /* =========================
               CHECK DURATION
            ========================= */

            if (
                !Number.isFinite(
                    appointmentDuration
                ) ||
                appointmentDuration < minimumHours
            ) {

                return res.status(400).json({

                    message:
                        `On-site Support (${onSiteSupportType}) requires a minimum duration of ${minimumHours} hour(s).`

                });

            }


            /* =========================
               CHECK 0.5 HOUR INCREMENTS
            ========================= */

            if (
                !Number.isInteger(
                    appointmentDuration * 2
                )
            ) {

                return res.status(400).json({

                    message:
                        "Appointment duration must be in 0.5-hour increments."

                });

            }

        }


        /* =========================
           GET CUSTOMER CREDITS
        ========================= */

        let currentCredits = 0;


        if (customer) {

            currentCredits =
                Number(
                    customer["Credits"] || 0
                );

        }


        /* =========================
           CHECK CREDITS
        ========================= */

        if (
            customer &&
            req.body.supportType ===
            "On-site Support" &&
            currentCredits <
            appointmentDuration
        ) {

            return res.status(400).json({

                message:
                    "You only have " +
                    currentCredits +
                    " credit(s), but you requested " +
                    appointmentDuration +
                    " hour(s)."

            });

        }


        /* =========================
           DEDUCT CREDITS
        ========================= */

        let remainingCredits =
            currentCredits;


        if (
            customer &&
            req.body.supportType ===
            "On-site Support"
        ) {

            remainingCredits =
                currentCredits -
                appointmentDuration;


            customersData[customerIndex]["Credits"] =
                remainingCredits;

        }


        /* =========================
           SAVE CUSTOMER SHEET
        ========================= */

        workbook.Sheets["Customer"] =
            XLSX.utils.json_to_sheet(
                customersData
            );


        /* =========================
           GET TICKET DATA
        ========================= */

        const ticketWorksheet =
            workbook.Sheets["Ticket"];


        if (!ticketWorksheet) {

            return res.status(500).json({

                message:
                    "Ticket sheet not found."

            });

        }


        const ticketsData =
            XLSX.utils.sheet_to_json(
                ticketWorksheet
            );


        /* =========================
           CREATE TICKET
        ========================= */

        const ticket = {

            "Ticket ID":
                "T-" + Date.now(),

            "Customer ID":
                req.body.customerId || "",

            "Customer Name":
                req.body.customerName || "",

            "Email":
                req.body.email || "",

            "Issue":
                req.body.issue || "",

            "Support Type":
                req.body.supportType || "",

            "On-site Support Type":
                req.body.supportType ===
                "On-site Support"
                    ? req.body.onSiteSupportType || ""
                    : "",

            "Status":
                "Open",

            "Assigned Engineer":
                "",

            "Appointment Date":
                req.body.supportType ===
                "On-site Support"
                    ? req.body.appointmentDate
                    : "",

            "Appointment Time":
                req.body.supportType ===
                "On-site Support"
                    ? req.body.appointmentTime
                    : "",

            "Appointment Duration":
                appointmentDuration,

            "Appointment Status":
                "Pending",

            "Created Date":
                new Date().toISOString(),

            "Service Result":
                ""

        };


        /* =========================
           ADD TICKET
        ========================= */

        ticketsData.push(ticket);


        /* =========================
           SAVE TICKET SHEET
        ========================= */

        workbook.Sheets["Ticket"] =
            XLSX.utils.json_to_sheet(
                ticketsData
            );


        /* =========================
           SAVE EXCEL FILE
        ========================= */

        writeWorkbook(workbook);

        console.log(
            "New ticket saved to Excel:",
            ticket
        );


        console.log(
            "Customer credits:",
            currentCredits,
            "->",
            remainingCredits
        );


        /* =========================
           SEND RESPONSE
        ========================= */

        res.status(201).json({

            message:
                "Ticket created successfully.",

            ticketId:
                ticket["Ticket ID"],

            remainingCredits:
                remainingCredits

        });

    } catch (error) {

        console.error(
            "Create ticket error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to create ticket."

        });

    }

});


/* =========================================================
   GET ALL TICKETS
========================================================= */

app.get("/api/tickets", (req, res) => {

    try {

        const customerId =
            req.query.customerId;


        const workbook =
            XLSX.readFile(excelFile);


        const worksheet =
            workbook.Sheets["Ticket"];


        if (!worksheet) {

            return res.json([]);

        }


        const ticketsData =
            XLSX.utils.sheet_to_json(
                worksheet
            );


        /* =========================
           CUSTOMER VIEW
        ========================= */

        if (customerId) {

            const customerTickets =
                ticketsData.filter(
                    ticket =>
                        ticket["Customer ID"] ===
                        customerId
                );


            return res.json(
                customerTickets
            );

        }


        /* =========================
           STAFF VIEW
        ========================= */

        res.json(
            ticketsData
        );

    } catch (error) {

        console.error(
            "Get tickets error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to load tickets."

        });

    }

});


/* =========================================================
   GET SINGLE TICKET
========================================================= */

app.get(
    "/api/tickets/:ticketId",
    (req, res) => {

        try {

            const ticketId =
                req.params.ticketId;


            const workbook =
                XLSX.readFile(
                    excelFile
                );


            const worksheet =
                workbook.Sheets["Ticket"];


            if (!worksheet) {

                return res.status(404).json({

                    message:
                        "Ticket sheet not found."

                });

            }


            const ticketsData =
                XLSX.utils.sheet_to_json(
                    worksheet
                );


            const ticket =
                ticketsData.find(
                    ticket =>
                        ticket["Ticket ID"] ===
                        ticketId
                );


            if (!ticket) {

                return res.status(404).json({

                    message:
                        "Ticket not found."

                });

            }


            res.json(ticket);

        } catch (error) {

            console.error(
                "Get single ticket error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to load ticket."

            });

        }

    }
);


/* =========================================================
   UPDATE TICKET
========================================================= */

app.put(
    "/api/tickets/:ticketId",
    (req, res) => {

        try {

            const ticketId =
                req.params.ticketId;


            const workbook =
                XLSX.readFile(
                    excelFile
                );


            const worksheet =
                workbook.Sheets["Ticket"];


            if (!worksheet) {

                return res.status(404).json({

                    message:
                        "Ticket sheet not found."

                });

            }


            const ticketsData =
                XLSX.utils.sheet_to_json(
                    worksheet
                );


            /* =========================
               FIND TICKET
            ========================= */

            const ticketIndex =
                ticketsData.findIndex(
                    ticket =>
                        ticket["Ticket ID"] ===
                        ticketId
                );


            if (ticketIndex === -1) {

                return res.status(404).json({

                    message:
                        "Ticket not found."

                });

            }


            /* =========================
               UPDATE TICKET
            ========================= */

            ticketsData[ticketIndex][
                "Assigned Engineer"
            ] =
                req.body.assignedEngineer || "";


            ticketsData[ticketIndex][
                "Status"
            ] =
                req.body.status || "Open";


            ticketsData[ticketIndex][
                "Appointment Status"
            ] =
                req.body.appointmentStatus ||
                "Pending";


            ticketsData[ticketIndex][
                "Service Result"
            ] =
                req.body.serviceResult || "";


            /* =========================
               SAVE
            ========================= */

            workbook.Sheets["Ticket"] =
                XLSX.utils.json_to_sheet(
                    ticketsData
                );


            writeWorkbook(workbook);

            console.log(
                "Ticket updated:",
                ticketId
            );


            res.json({

                message:
                    "Ticket updated successfully."

            });

        } catch (error) {

            console.error(
                "Update ticket error:",
                error
            );

                if (error && error.code === "DATABASE_LOCKED") {
                    return res.status(409).json({
                        message: error.message
                    });
                }

        }

    }
);


/* =========================================================
   DELETE TICKET
========================================================= */

app.delete(
    "/api/tickets/:ticketId",
    (req, res) => {

        try {

            const ticketId =
                req.params.ticketId;


            const workbook =
                XLSX.readFile(
                    excelFile
                );


            const worksheet =
                workbook.Sheets["Ticket"];


            if (!worksheet) {

                return res.status(404).json({

                    message:
                        "Ticket sheet not found."

                });

            }


            const ticketsData =
                XLSX.utils.sheet_to_json(
                    worksheet
                );


            /* =========================
               FIND TICKET
            ========================= */

            const ticketIndex =
                ticketsData.findIndex(
                    ticket =>
                        ticket["Ticket ID"] ===
                        ticketId
                );


            if (ticketIndex === -1) {

                return res.status(404).json({

                    message:
                        "Ticket not found."

                });

            }


            /* =========================
               DELETE TICKET
            ========================= */

            ticketsData.splice(
                ticketIndex,
                1
            );


            workbook.Sheets["Ticket"] =
                XLSX.utils.json_to_sheet(
                    ticketsData
                );


            writeWorkbook(workbook);

            console.log(
                "Ticket deleted:",
                ticketId
            );


            res.json({

                message:
                    "Ticket deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete ticket error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to delete ticket."

            });

        }

    }
);


/* =========================================================
   GET STAFF
========================================================= */

app.get("/api/staff", (req, res) => {

    try {

        const workbook =
            XLSX.readFile(
                excelFile
            );


        const worksheet =
            workbook.Sheets["Staff"];


        if (!worksheet) {

            return res.status(404).json({

                message:
                    "Staff sheet not found."

            });

        }


        const staffData =
            XLSX.utils.sheet_to_json(
                worksheet
            );


        /*
           ONLY RETURN STAFF WHO CAN
           BE ASSIGNED AS ENGINEERS.
        */

        const staffList =
            staffData
                .filter(
                    staff =>
                        String(
                            staff.Role || ""
                        ).trim() ===
                            "IT Support Staff" ||
                        String(
                            staff.Role || ""
                        ).trim() ===
                            "Engineer"
                )
                .map(
                    staff => ({

                        staffId:
                            staff["Staff ID"],

                        name:
                            staff.Name,

                        email:
                            staff.Email,

                        role:
                            staff.Role,

                        department:
                            staff.Department

                    })
                );


        res.json(
            staffList
        );

    } catch (error) {

        console.error(
            "Get staff error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to load staff."

        });

    }

});


/* =========================================================
   SUBMIT SERVICE REPORT
========================================================= */

app.post(
    "/api/tickets/:ticketId/service-report",
    (req, res) => {

        try {

            const ticketId =
                req.params.ticketId;


            const {
                onsite,
                engineer,
                date,
                signInTime,
                signOutTime,
                tasksDone,
                resolution
            } = req.body;


            const workbook =
                XLSX.readFile(
                    excelFile
                );


            /* =========================
               GET SERVICE REPORT DATA
            ========================= */

            let reportsData = [];


            if (
                workbook.Sheets["ServiceReport"]
            ) {

                reportsData =
                    XLSX.utils.sheet_to_json(
                        workbook.Sheets[
                            "ServiceReport"
                        ]
                    );

            }


            /* =========================
               GET TICKET DATA
            ========================= */

            const ticketSheet =
                workbook.Sheets["Ticket"];


            if (!ticketSheet) {

                return res.status(404).json({

                    message:
                        "Ticket sheet not found."

                });

            }


            const ticketsData =
                XLSX.utils.sheet_to_json(
                    ticketSheet
                );


            /* =========================
               FIND TICKET
            ========================= */

            const ticketIndex =
                ticketsData.findIndex(
                    ticket =>
                        ticket["Ticket ID"] ===
                        ticketId
                );


            if (ticketIndex === -1) {

                return res.status(404).json({

                    message:
                        "Ticket not found."

                });

            }


            const ticket =
                ticketsData[ticketIndex];


            /* =========================
               CALCULATE HOURS
            ========================= */

            let hoursSpent = 0;


            if (
                signInTime &&
                signOutTime
            ) {

                const start =
                    new Date(
                        `1970-01-01T${signInTime}:00`
                    );


                const end =
                    new Date(
                        `1970-01-01T${signOutTime}:00`
                    );


                const diffMs =
                    end - start;


                if (diffMs > 0) {

                    hoursSpent =
                        +(
                            diffMs /
                            (1000 * 60 * 60)
                        ).toFixed(2);

                }

            }


            /* =========================
               CREATE SERVICE REPORT
            ========================= */

            const newReport = {

                "Report ID":
                    "SR-" + Date.now(),

                "Ticket ID":
                    ticket["Ticket ID"],

                "Customer ID":
                    ticket["Customer ID"] || "",

                "Customer Name":
                    ticket["Customer Name"] || "",

                "Engineer":
                    engineer ||
                    ticket["Assigned Engineer"] ||
                    "",

                "Onsite":
                    onsite
                        ? "Yes"
                        : "No",

                "Date":
                    date ||
                    new Date()
                        .toISOString()
                        .split("T")[0],

                "SignInTime":
                    signInTime || "",

                "SignOutTime":
                    signOutTime || "",

                "HoursSpent":
                    hoursSpent,

                "TasksDone":
                    tasksDone || "",

                "Resolution":
                    resolution || "",

                "Created At":
                    new Date().toISOString()

            };


            reportsData.push(
                newReport
            );


            /* =========================
               CLOSE TICKET
            ========================= */

            ticketsData[ticketIndex][
                "Status"
            ] =
                "Closed";


            ticketsData[ticketIndex][
                "Service Result"
            ] =
                resolution || "";


            if (engineer) {

                ticketsData[ticketIndex][
                    "Assigned Engineer"
                ] =
                    engineer;

            }


            /* =========================
               SAVE BOTH SHEETS
            ========================= */

            workbook.Sheets[
                "ServiceReport"
            ] =
                XLSX.utils.json_to_sheet(
                    reportsData
                );


            workbook.Sheets[
                "Ticket"
            ] =
                XLSX.utils.json_to_sheet(
                    ticketsData
                );


            writeWorkbook(workbook);

            console.log(
                "Service report created:",
                newReport
            );


            res.status(201).json({

                message:
                    "Service report generated and saved successfully.",

                report:
                    newReport

            });

        } catch (error) {

            console.error(
                "Service report error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to create service report."

            });

        }

    }
);


/* =========================================================
   GET SERVICE REPORTS FOR A TICKET
========================================================= */

app.get(
    "/api/tickets/:ticketId/service-reports",
    (req, res) => {

        try {

            const ticketId =
                req.params.ticketId;


            const workbook =
                XLSX.readFile(
                    excelFile
                );


            /* =========================
               NO SERVICE REPORT SHEET
            ========================= */

            if (
                !workbook.Sheets[
                    "ServiceReport"
                ]
            ) {

                return res.json([]);

            }


            const reportsData =
                XLSX.utils.sheet_to_json(
                    workbook.Sheets[
                        "ServiceReport"
                    ]
                );


            const ticketReports =
                reportsData.filter(
                    report =>
                        report["Ticket ID"] ===
                        ticketId
                );


            res.json(
                ticketReports
            );

        } catch (error) {

            console.error(
                "Get service reports error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to load service reports."

            });

        }

    }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `IT Ticketing System running on http://localhost:${PORT}`
        );

    }
);