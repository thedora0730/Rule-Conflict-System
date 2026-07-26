/* ==========================================================
   IKS Śāstra Rule Precedence System
   Main JavaScript
========================================================== */

/* ==========================
   Fade In Animation
========================== */

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {

        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }

    });
});

const hiddenElements = document.querySelectorAll(
    ".feature-card, .about-card, .hero-left, .hero-right"
);

hiddenElements.forEach((el) => {

    el.classList.add("hidden");

    observer.observe(el);

});

/* ==========================
   Navbar Active Link
========================== */

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    link.addEventListener("click", function () {

        navLinks.forEach(item => item.classList.remove("active"));

        this.classList.add("active");

    });

});

/* ==========================
   Smooth Button Animation
========================== */

const buttons = document.querySelectorAll(".btn-primary, .btn-secondary");

buttons.forEach(button => {

    button.addEventListener("mouseenter", () => {

        button.style.transform = "translateY(-4px)";

    });

    button.addEventListener("mouseleave", () => {

        button.style.transform = "translateY(0px)";

    });

});

/* ==========================
   Floating Hero Diagram
========================== */

const diagram = document.querySelector(".diagram");

if (diagram) {

    diagram.classList.add("float");

}

/* ==========================
   Hero Title Animation
========================== */

const heroTitle = document.querySelector(".hero-left h1");

if (heroTitle) {

    heroTitle.classList.add("fade-up");

}

/* ==========================
   Card Hover Glow
========================== */

const cards = document.querySelectorAll(".feature-card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.borderColor = "#E67E22";

    });

    card.addEventListener("mouseleave", () => {

        card.style.borderColor = "#F2E3D5";

    });

});

/* ==========================
   Console Message
========================== */

console.log("✅ IKS Śāstra Rule Precedence System Loaded Successfully");