/* =========================================================
   MAIN PAGE
========================================================= */

/*
   CUSTOMER-FACING ENTRY DISABLED.
   Restore by uncommenting the original block below.
   Original behavior: redirect customer users to /customer-login.html
   // function loginAsCustomer() {
   //     window.location.href = "/customer-login.html";
   // }
*/

function loginAsStaff() {
    window.location.href = "/staff-login.html";
}


/* =========================================================
   STAFF LOGIN
========================================================= */

const staffLoginForm = document.getElementById("staffLoginForm");

if (staffLoginForm) {

    staffLoginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("staffEmail").value.trim();

        const password =
            document.getElementById("staffPassword").value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        try {

            const response = await fetch("/api/staff/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })

            });

            const data = await response.json();

            if (response.ok) {

                localStorage.setItem(
                    "staff",
                    JSON.stringify(data.staff)
                );

                alert("Login successful!");

                window.location.href = "/staff.html";

            } else {

                alert(
                    data.message ||
                    "Invalid email or password."
                );

            }

        } catch (error) {

            console.error("Staff login error:", error);

            alert(
                "Unable to connect to the server. Please make sure the server is running."
            );

        }

    });

}


/* =========================================================
   CUSTOMER TICKET FORM
========================================================= */

const ticketForm = document.getElementById("ticketForm");

const supportTypeSelect =
    document.getElementById("supportType");

const appointmentSection =
    document.getElementById("appointmentSection");

const onSiteSupportTypeSelect =
    document.getElementById("onSiteSupportType");

const durationField =
    document.getElementById("durationField");

const appointmentDurationInput =
    document.getElementById("appointmentDuration");


function getOnSiteDurationSettings(onSiteSupportType) {

    switch ((onSiteSupportType || "").trim()) {

        case "Maintenance":
            return {
                minHours: 1,
                label: "Minimum 1 hour"
            };

        case "TEMP":
            return {
                minHours: 2,
                label: "Minimum 2 hours"
            };

        case "Project":
            // TODO: confirm the official project minimum with the supervisor.
            // This default assumes a minimum of 6 hours until confirmed.
            return {
                minHours: 6,
                label: "Minimum 6 hours"
            };

        default:
            return null;
    }

}


/* =========================================================
   SHOW / HIDE APPOINTMENT FIELDS
========================================================= */

if (supportTypeSelect && appointmentSection) {

    function updateAppointmentFields() {

        const supportType =
            supportTypeSelect.value.trim().toLowerCase();

        const isOnSiteSupport =
            supportType === "on-site support";


        appointmentSection.style.display =
            isOnSiteSupport ? "block" : "none";


        if (!isOnSiteSupport) {

            const appointmentDate =
                document.getElementById("appointmentDate");

            const appointmentTime =
                document.getElementById("appointmentTime");

            const onSiteType =
                document.getElementById("onSiteSupportType");


            if (appointmentDate) {
                appointmentDate.value = "";
            }

            if (appointmentTime) {
                appointmentTime.value = "";
            }

            if (onSiteType) {
                onSiteType.value = "";
            }

            if (appointmentDurationInput) {
                appointmentDurationInput.value = "";
                appointmentDurationInput.min = "1";
                appointmentDurationInput.placeholder =
                    "Select an on-site support type";
            }

            if (durationField) {
                durationField.style.display = "none";
            }

            return;

        }


        const selectedType =
            onSiteSupportTypeSelect?.value || "";

        const settings =
            getOnSiteDurationSettings(selectedType);


        if (durationField) {
            durationField.style.display =
                settings ? "block" : "none";
        }


        if (appointmentDurationInput) {
            if (settings) {
                appointmentDurationInput.min =
                    String(settings.minHours);
                appointmentDurationInput.placeholder =
                    settings.label;
            } else {
                appointmentDurationInput.value = "";
                appointmentDurationInput.min = "1";
                appointmentDurationInput.placeholder =
                    "Select an on-site support type";
            }
        }

    }


    supportTypeSelect.addEventListener(
        "change",
        updateAppointmentFields
    );

    if (onSiteSupportTypeSelect) {
        onSiteSupportTypeSelect.addEventListener(
            "change",
            updateAppointmentFields
        );
    }


    // Run when page first loads
    updateAppointmentFields();

}


/* =========================================================
   SUBMIT TICKET
========================================================= */

if (ticketForm) {

    ticketForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const supportType =
                document.getElementById("supportType")?.value || "";

            const onSiteSupportType =
                document.getElementById("onSiteSupportType")?.value || "";

            const isOnSite =
                supportType.trim().toLowerCase() ===
                "on-site support";


            /* -----------------------------------------
               APPOINTMENT VALUES
            ----------------------------------------- */

            let appointmentDate = null;
            let appointmentTime = null;
            let appointmentDuration = null;


            if (isOnSite) {

                if (!onSiteSupportType) {
                    alert(
                        "Please select an on-site support type before submitting the ticket."
                    );
                    return;
                }

                const onSiteSettings =
                    getOnSiteDurationSettings(onSiteSupportType);

                if (!onSiteSettings) {
                    alert(
                        "Please select a valid on-site support type."
                    );
                    return;
                }

                appointmentDate =
                    document.getElementById(
                        "appointmentDate"
                    )?.value || null;


                appointmentTime =
                    document.getElementById(
                        "appointmentTime"
                    )?.value || null;


                appointmentDuration =
                    document.getElementById(
                        "appointmentDuration"
                    )?.value || null;

                if (
                    !appointmentDuration ||
                    Number(appointmentDuration) <
                        onSiteSettings.minHours
                ) {
                    alert(
                        `Duration is required for ${onSiteSupportType} and must be at least ${onSiteSettings.minHours} hour(s).`
                    );
                    return;
                }

            }


            /* -----------------------------------------
               TICKET DATA
            ----------------------------------------- */

            const ticket = {

                customerName:
                    document.getElementById(
                        "customerName"
                    )?.value || "",


                email:
                    document.getElementById(
                        "email"
                    )?.value || "",


                issue:
                    document.getElementById(
                        "issue"
                    )?.value || "",


                priority:
                    document.getElementById(
                        "priority"
                    )?.value || "",


                supportType:
                    supportType,


                onSiteSupportType:
                    isOnSite ? onSiteSupportType : "",


                appointmentDate:
                    appointmentDate,


                appointmentTime:
                    appointmentTime,


                appointmentDuration:
                    appointmentDuration

            };


            console.log(
                "Submitting ticket:",
                ticket
            );


            try {

                const response =
                    await fetch(
                        "/api/tickets",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(ticket)

                        }
                    );


                const result =
                    await response.json();


                if (response.ok) {

                    const ticketMessage =
                        document.getElementById(
                            "ticketMessage"
                        );


                    if (ticketMessage) {

                        ticketMessage.textContent =
                            `Ticket created successfully! Ticket ID: ${result.ticketId}`;

                    } else {

                        alert(
                            `Ticket created successfully!\nTicket ID: ${result.ticketId}`
                        );

                    }


                    ticketForm.reset();


                    if (onSiteSupportTypeSelect) {
                        onSiteSupportTypeSelect.value = "";
                    }

                    if (appointmentDurationInput) {
                        appointmentDurationInput.value = "";
                        appointmentDurationInput.min = "1";
                        appointmentDurationInput.placeholder =
                            "Select an on-site support type";
                    }

                    if (durationField) {
                        durationField.style.display = "none";
                    }


                    // Hide appointment section again
                    if (appointmentSection) {

                        appointmentSection.style.display =
                            "none";

                    }


                } else {

                    alert(
                        result.message ||
                        "Failed to create ticket."
                    );

                }


            } catch (error) {

                console.error(
                    "Ticket creation error:",
                    error
                );


                alert(
                    "Unable to connect to the server."
                );

            }

        }
    );

}


/* =========================================================
   STAFF DASHBOARD
========================================================= */

const ticketTableBody =
    document.getElementById("ticketTableBody");

if (ticketTableBody) {

    loadStaffDashboard();

}


async function loadStaffDashboard() {

    try {

        const response =
            await fetch("/api/tickets");

        const tickets =
            await response.json();


        if (!response.ok) {

            throw new Error(
                "Failed to load tickets."
            );

        }


        const totalTickets =
            document.getElementById("totalTickets");

        const openTickets =
            document.getElementById("openTickets");

        const inProgressTickets =
            document.getElementById("inProgressTickets");

        const closedTickets =
            document.getElementById("closedTickets");

        const emptyState =
            document.getElementById("emptyState");


        if (totalTickets) {

            totalTickets.textContent =
                tickets.length;

        }


        if (openTickets) {

            openTickets.textContent =
                tickets.filter(
                    ticket =>
                        ticket.Status === "Open"
                ).length;

        }


        if (inProgressTickets) {

            inProgressTickets.textContent =
                tickets.filter(
                    ticket =>
                        ticket.Status === "In Progress"
                ).length;

        }


        if (closedTickets) {

            closedTickets.textContent =
                tickets.filter(
                    ticket =>
                        ticket.Status === "Closed"
                ).length;

        }


        ticketTableBody.innerHTML = "";


        if (tickets.length === 0) {

            if (emptyState) {
                emptyState.style.display = "block";
            }

            return;

        }


        if (emptyState) {
            emptyState.style.display = "none";
        }


        tickets.forEach(ticket => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <a href="/ticket-details.html?ticketId=${encodeURIComponent(
                        ticket["Ticket ID"] || ticket.ticketId
                    )}">
                        ${ticket["Ticket ID"] || ticket.ticketId || ""}
                    </a>
                </td>

                <td>
                    ${ticket["Customer Name"] || ticket.customerName || ""}
                </td>

                <td>
                    ${ticket.Issue || ticket.issue || ""}
                </td>

                <td>
                    ${ticket["Support Type"] || ticket.supportType || ""}
                </td>

                <td>
                    ${ticket.Status || ticket.status || ""}
                </td>

                <td>
                    <a
                        href="/ticket-details.html?ticketId=${encodeURIComponent(
                            ticket["Ticket ID"] || ticket.ticketId
                        )}"
                        class="edit-ticket-btn"
                    >
                        Edit
                    </a>
                </td>

            `;

            ticketTableBody.appendChild(row);

        });


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


/* =========================================================
   STAFF PROFILE
========================================================= */

const profileName =
    document.getElementById("profileName");

if (profileName) {

    loadStaffProfile();

}


async function loadStaffProfile() {

    const staffData =
        localStorage.getItem("staff");


    if (!staffData) {

        alert("Please log in first.");

        window.location.href =
            "/staff-login.html";

        return;

    }


    const staff =
        JSON.parse(staffData);


    const profileName =
        document.getElementById("profileName");

    const profileDepartment =
        document.getElementById("profileDepartment");

    const staffName =
        document.getElementById("staffName");

    const staffEmail =
        document.getElementById("staffEmail");

    const staffRole =
        document.getElementById("staffRole");

    const staffDepartment =
        document.getElementById("staffDepartment");


    if (profileName) {
        profileName.textContent =
            staff.name || "";
    }

    if (profileDepartment) {
        profileDepartment.textContent =
            staff.department || "";
    }

    if (staffName) {
        staffName.textContent =
            staff.name || "";
    }

    if (staffEmail) {
        staffEmail.textContent =
            staff.email || "";
    }

    if (staffRole) {
        staffRole.textContent =
            staff.role || "";
    }

    if (staffDepartment) {
        staffDepartment.textContent =
            staff.department || "";
    }

}


/* =========================================================
   TICKET DETAILS
========================================================= */

const ticketIdElement =
    document.getElementById("ticketId");

if (ticketIdElement) {

    loadTicketDetails();

}


async function loadTicketDetails() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const ticketId =
        params.get("ticketId");


    if (!ticketId) {

        alert("No ticket ID was provided.");

        return;

    }


    try {

        const response =
            await fetch(
                `/api/tickets/${encodeURIComponent(ticketId)}`
            );


        const ticket =
            await response.json();


        if (!response.ok) {

            throw new Error(
                ticket.message ||
                "Failed to load ticket."
            );

        }


        /* -----------------------------------------
           LOAD NORMAL TICKET INFORMATION
        ----------------------------------------- */

        setField(
            "ticketId",
            ticket["Ticket ID"] || ticket.ticketId
        );

        setField(
            "customerId",
            ticket["Customer ID"] || ticket.customerId
        );

        setField(
            "customerName",
            ticket["Customer Name"] || ticket.customerName
        );

        setField(
            "customerEmail",
            ticket.Email || ticket.email
        );

        setField(
            "issue",
            ticket.Issue || ticket.issue
        );

        const supportTypeValue =
            ticket["Support Type"] || ticket.supportType || "";

        setField(
            "supportType",
            supportTypeValue
        );

        const isOnSiteTicket =
            String(supportTypeValue).trim().toLowerCase() ===
            "on-site support";

        toggleOnSiteTicketFields(isOnSiteTicket);
        updateAssignedRoleLabel(supportTypeValue);

        setField(
            "appointmentDate",
            ticket["Appointment Date"] || ticket.appointmentDate
        );

        setField(
            "appointmentTime",
            ticket["Appointment Time"] || ticket.appointmentTime
        );

        setField(
            "createdDate",
            ticket["Created Date"] || ticket.createdDate
        );


        /* -----------------------------------------
           LOAD ENGINEERS
        ----------------------------------------- */

        await loadEngineers(
            ticket["Assigned Engineer"] ||
            ticket.assignedEngineer ||
            ""
        );


        /* -----------------------------------------
           LOAD OTHER EDITABLE FIELDS
        ----------------------------------------- */

        setField(
            "status",
            ticket.Status || ticket.status
        );

        setField(
            "appointmentStatus",
            ticket["Appointment Status"] ||
            ticket.appointmentStatus
        );

        setField(
            "serviceResult",
            ticket["Service Result"] ||
            ticket.serviceResult
        );


        const ticketStatus =
            document.getElementById("ticketStatus");

        if (ticketStatus) {

            ticketStatus.textContent =
                ticket.Status ||
                ticket.status ||
                "";

        }


    } catch (error) {

        console.error(
            "Ticket details error:",
            error
        );

        alert(
            "Unable to load ticket details."
        );

    }

}


/* =========================================================
   VIEW SAVED SERVICE REPORT
========================================================= */

async function viewSavedReport() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const ticketId =
        params.get("ticketId");

    if (!ticketId) {
        alert("Ticket ID not found.");
        return;
    }

    try {

        const response =
            await fetch(
                `/api/tickets/${encodeURIComponent(ticketId)}/service-reports`
            );

        if (!response.ok) {
            throw new Error(
                "Failed to load service report."
            );
        }

        const reports =
            await response.json();

        if (!Array.isArray(reports) || reports.length === 0) {
            alert(
                "No service report has been created for this ticket yet."
            );
            return;
        }

        const report =
            reports[reports.length - 1];

        const modal =
            document.getElementById("reportModal");

        if (!modal) {
            alert("Service report modal is unavailable.");
            return;
        }

        const repTicketId =
            document.getElementById("repTicketId");

        const repCustomer =
            document.getElementById("repCustomer");

        const repEmail =
            document.getElementById("repEmail");

        const repIssue =
            document.getElementById("repIssue");

        const repSupportType =
            document.getElementById("repSupportType");

        const repEngineer =
            document.getElementById("repEngineer");

        const repEngineerLabel =
            document.getElementById("repEngineerLabel");

        const repOnsite =
            document.getElementById("repOnsite");

        const repDate =
            document.getElementById("repDate");

        const repTime =
            document.getElementById("repTime");

        const repHours =
            document.getElementById("repHours");

        const repTasks =
            document.getElementById("repTasks");

        const repResolution =
            document.getElementById("repResolution");

        if (repTicketId) {
            repTicketId.textContent =
                report["Ticket ID"] || ticketId;
        }

        if (repCustomer) {
            repCustomer.textContent =
                `${report["Customer Name"] || ""} (${report["Customer ID"] || ""})`;
        }

        if (repEmail) {
            repEmail.textContent =
                report.Email || report["Customer Email"] || "-";
        }

        if (repIssue) {
            repIssue.textContent =
                report.Issue || report["Reported Issue"] || "-";
        }

        if (repSupportType) {
            repSupportType.textContent =
                report["Support Type"] || report.supportType || "-";
        }

        if (repEngineerLabel) {
            repEngineerLabel.textContent =
                getAssignmentRoleLabel(
                    report["Support Type"] || report.supportType || ""
                );
        }

        if (repEngineer) {
            repEngineer.textContent =
                report.Engineer || report["Assigned Engineer"] || "-";
        }

        if (repOnsite) {
            repOnsite.textContent =
                report.Onsite === "Yes"
                    ? "On-site Support"
                    : "Remote / Off-site";
        }

        if (repDate) {
            repDate.textContent =
                report.Date || "-";
        }

        if (repTime) {
            repTime.textContent =
                `${report.SignInTime || "-"} to ${report.SignOutTime || "-"}`;
        }

        if (repHours) {
            repHours.textContent =
                `${report.HoursSpent || 0} Hours`;
        }

        if (repTasks) {
            repTasks.textContent =
                report.TasksDone || "-";
        }

        if (repResolution) {
            repResolution.textContent =
                report.Resolution || "-";
        }

        modal.style.display = "flex";

    } catch (error) {

        console.error(
            "Failed to load report:",
            error
        );

        alert(
            "Error loading service report."
        );

    }

}


/* =========================================================
   LOAD ENGINEERS
========================================================= */

async function loadEngineers(currentEngineer = "") {

    const engineerSelect =
        document.getElementById("assignedEngineer");


    if (!engineerSelect) {
        return;
    }


    try {

        const response =
            await fetch("/api/staff");


        if (!response.ok) {

            throw new Error(
                "Failed to load staff."
            );

        }


        const staff =
            await response.json();


        /* Clear existing options */

        engineerSelect.innerHTML = "";


        /* Unassigned option */

        const unassignedOption =
            document.createElement("option");

        unassignedOption.value = "";

        unassignedOption.textContent =
            "Unassigned";

        engineerSelect.appendChild(
            unassignedOption
        );


        /* Add staff members */

        staff.forEach(person => {

            const option =
                document.createElement("option");


            option.value =
                person.name;

            option.textContent =
                person.name;


            /* Keep currently assigned engineer selected */

            if (
                person.name === currentEngineer
            ) {

                option.selected = true;

            }


            engineerSelect.appendChild(
                option
            );

        });


    } catch (error) {

        console.error(
            "Error loading engineers:",
            error
        );

    }

}


/* =========================================================
   SET FIELD
========================================================= */

function setField(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
    ) {

        element.value =
            value ?? "";

    } else {

        element.textContent =
            value ?? "";

    }

}


function getAssignmentRoleLabel(supportTypeValue) {

    return String(supportTypeValue || "").trim().toLowerCase() ===
        "on-site support"
        ? "Assigned Technician"
        : "Assigned Engineer";

}


function updateAssignedRoleLabel(supportTypeValue) {

    const labelElement =
        document.getElementById("assignedRoleLabel");

    if (labelElement) {
        labelElement.textContent =
            getAssignmentRoleLabel(supportTypeValue);
    }

    const reportLabelElement =
        document.getElementById("repEngineerLabel");

    if (reportLabelElement) {
        reportLabelElement.textContent =
            getAssignmentRoleLabel(supportTypeValue);
    }

}


function toggleOnSiteTicketFields(isOnSiteTicket) {

    const onSiteRows = [
        document.getElementById("appointmentDateRow"),
        document.getElementById("appointmentTimeRow")
    ];

    const onSiteControls = [
        document.getElementById("appointmentStatusGroup")
    ];


    onSiteRows.forEach(element => {
        if (element) {
            element.style.display =
                isOnSiteTicket ? "grid" : "none";
        }
    });

    onSiteControls.forEach(element => {
        if (element) {
            element.style.display =
                isOnSiteTicket ? "block" : "none";
        }
    });

}


/* =========================================================
   SAVE TICKET CHANGES
========================================================= */

async function saveChanges() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const ticketId =
        params.get("ticketId");


    if (!ticketId) {

        alert("Ticket ID not found.");

        return;

    }


    const supportTypeValue =
        document.getElementById("supportType")?.textContent || "";

    const isOnSiteTicket =
        String(supportTypeValue).trim().toLowerCase() ===
        "on-site support";

    const updatedTicket = {

        status:
            document.getElementById("status")?.value || "",

        assignedEngineer:
            document.getElementById("assignedEngineer")?.value || "",

        appointmentStatus:
            isOnSiteTicket
                ? document.getElementById("appointmentStatus")?.value || ""
                : "",

        serviceResult:
            document.getElementById("serviceResult")?.value || ""

    };


    try {

        const response =
            await fetch(
                `/api/tickets/${encodeURIComponent(ticketId)}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body:
                        JSON.stringify(updatedTicket)

                }
            );


        const result =
            await response.json();


        if (response.ok) {

            alert(
                result.message ||
                "Ticket updated successfully."
            );

            location.reload();

        } else {

            alert(
                result.message ||
                "Failed to update ticket."
            );

        }


    } catch (error) {

        console.error(
            "Save changes error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );

    }

}


/* =========================================================
   DELETE TICKET
========================================================= */

async function deleteTicket() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const ticketId =
        params.get("ticketId");


    if (!ticketId) {

        alert("Ticket ID not found.");

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this ticket?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/tickets/${encodeURIComponent(ticketId)}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (response.ok) {

            alert(
                result.message ||
                "Ticket deleted successfully."
            );

            window.location.href =
                "/staff.html";

        } else {

            alert(
                result.message ||
                "Failed to delete ticket."
            );

        }


    } catch (error) {

        console.error(
            "Delete ticket error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutStaff() {

    localStorage.removeItem("staff");

    window.location.href =
        "/staff-login.html";

}


/*
   CUSTOMER-FACING LOGOUT DISABLED.
   Restore by uncommenting the original block below.
   Original behavior: localStorage.removeItem("customer"); window.location.href = "/customer-login.html";
   // function logoutCustomer() {
   //     localStorage.removeItem("customer");
   //     window.location.href = "/customer-login.html";
   // }
*/