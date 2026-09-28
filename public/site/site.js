// PS Business Hub marketing site: small additions on top of Creativo's
// main.js (which opens and closes FAQ items on click).
(function () {
  "use strict";

  // Keyboard access for the FAQ and mobile menu, and keep aria-expanded in
  // step with main.js's click toggle.
  document.querySelectorAll(".faq-item .faq-question").forEach((q) => {
    q.addEventListener("click", () => {
      q.setAttribute("aria-expanded", String(q.parentNode.classList.contains("faq-active")));
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        q.click();
      }
    });
  });
  const menu = document.querySelector(".mobile-nav-toggle");
  if (menu) {
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        menu.click();
      }
    });
  }

  // Pricing calculator: base subscription plus each ticked module.
  const calc = document.getElementById("calc");
  const total = document.getElementById("calc-total");
  if (calc && total) {
    const base = Number(calc.dataset.base);
    const update = () => {
      let sum = base;
      calc.querySelectorAll(".calc-module:checked").forEach((box) => (sum += Number(box.value)));
      total.textContent = Number.isInteger(sum) ? String(sum) : sum.toFixed(2);
    };
    calc.addEventListener("change", update);
    update();
  }
})();
