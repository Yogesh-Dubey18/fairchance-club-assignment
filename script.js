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
