
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

/* ======================================== */
/* 50. MOBILE & TABLET NAVIGATION           */
/* ======================================== */

document.addEventListener("DOMContentLoaded", () => {

    const menuToggle = document.getElementById("menu-toggle");
    const navigation = document.getElementById("primary-navigation");

    if (!menuToggle || !navigation) return;

    const mobileBreakpoint = window.matchMedia("(max-width: 1024px)");

    function closeMenu() {
        menuToggle.classList.remove("is-active");
        navigation.classList.remove("is-open");

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
    }

    menuToggle.addEventListener("click", () => {

        const isOpen = navigation.classList.toggle("is-open");

        menuToggle.classList.toggle("is-active", isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );

    });

    // Close menu after selecting a navigation link
    navigation.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    // Close menu with Escape key
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navigation.classList.contains("is-open")) {
            closeMenu();
            menuToggle.focus();
        }
    });

    // Close when clicking outside the navigation
    document.addEventListener("click", (event) => {
        if (
            navigation.classList.contains("is-open") &&
            !menuToggle.contains(event.target) &&
            !navigation.contains(event.target)
        ) {
            closeMenu();
        }
    });

    // Reset menu when returning to desktop width
    mobileBreakpoint.addEventListener("change", closeMenu);

});
