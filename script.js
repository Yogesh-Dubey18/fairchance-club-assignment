const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const modeButtons = document.querySelectorAll(".mode-button");
const drawSummaryText = document.querySelector("#draw-summary-text");

const drawSummaries = {
  Random: "1 jackpot carryover • 12 tier winners • publish pending",
  Weighted: "Weighted model found 4 strong score clusters • admin review suggested"
};

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    if (drawSummaryText) {
      drawSummaryText.textContent = drawSummaries[button.dataset.draw] || drawSummaries.Random;
    }
  });
});

const billingButtons = document.querySelectorAll(".billing-button");
const planPrices = document.querySelectorAll(".plan-price");
const planNotes = document.querySelectorAll(".plan-note");

billingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    billingButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    const selectedPlan = button.dataset.plan;

    planPrices.forEach((item) => {
      item.textContent =
        selectedPlan === "yearly" ? item.dataset.priceYearly : item.dataset.priceMonthly;
    });

    planNotes.forEach((item) => {
      item.textContent =
        selectedPlan === "yearly" ? item.dataset.noteYearly : item.dataset.noteMonthly;
    });
  });
});

const ADMIN_EMAIL = "admin@fairchance.club";
const ADMIN_PASSWORD = "FairChance@2026";
const ADMIN_SESSION_KEY = "fairchanceAdminAuth";
const currentPage = window.location.pathname.split("/").pop() || "index.html";

if (currentPage === "admin.html" && localStorage.getItem(ADMIN_SESSION_KEY) !== "true") {
  window.location.replace("admin-login.html");
}

if (currentPage === "admin-login.html" && localStorage.getItem(ADMIN_SESSION_KEY) === "true") {
  window.location.replace("admin.html");
}

const adminLoginForm = document.querySelector("#admin-login-form");
const adminLoginError = document.querySelector("#admin-login-error");

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.location.href = "admin.html";
      return;
    }

    if (adminLoginError) {
      adminLoginError.textContent = "Incorrect email or password. Please use the demo admin credentials.";
    }
  });
}

const adminLogoutButton = document.querySelector("#admin-logout");

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = "admin-login.html";
  });
}
