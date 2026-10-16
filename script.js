
/* ======================================== */
/* CONTACT FORM SUBMISSION                  */
/* ======================================== */

const contactForm = document.getElementById("contact-form");
const successMessage = document.getElementById("contact-success");
const errorMessage = document.getElementById("contact-error");

if (contactForm && successMessage && errorMessage) {

    contactForm.addEventListener("submit", async function(event) {

        // Prevent the browser from leaving the website.
        event.preventDefault();

        const submitButton = contactForm.querySelector(
            'button[type="submit"]'
        );

        const originalText = submitButton.innerHTML;

        // Prevent duplicate submissions.
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";

        errorMessage.hidden = true;

        try {

            const formData = new FormData(contactForm);

            const response = await fetch(contactForm.action, {
                method: "POST",
                body: formData,
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Form submission failed");
            }

            // Show success only after Formspree accepts it.
            contactForm.hidden = true;
            contactForm.style.display = "none";

            successMessage.hidden = false;

            // Move keyboard focus to the confirmation.
            successMessage.focus();

            // Clear the form after successful submission.
            contactForm.reset();

        } catch (error) {

            console.error("Contact form error:", error);

            errorMessage.hidden = false;

            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });
}
