function loginAsCustomer() {
    window.location.href = "/customer.html";
}

function loginAsStaff() {
    window.location.href = "/staff.html";
}

const ticketForm = document.getElementById("ticketForm");

if (ticketForm) {
    ticketForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const ticket = {
            customerName: document.getElementById("customerName").value,
            email: document.getElementById("email").value,
            issue: document.getElementById("issue").value,
            priority: document.getElementById("priority").value,
            appointmentDate: document.getElementById("appointmentDate").value,
            appointmentTime: document.getElementById("appointmentTime").value
        };

        const response = await fetch("/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(ticket)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById("ticketMessage").textContent =
                `Ticket created successfully! Ticket ID: ${result.ticketId}`;

            ticketForm.reset();
        } else {
            document.getElementById("ticketMessage").textContent =
                "Failed to create ticket.";
        }
    });
}