console.log("AddTheme JS LOADED");

document.addEventListener("shown.bs.offcanvas", function (e) {

    if (e.target.id !== "addThemeOffcanvas") return;

    const offcanvasEl = e.target;
    const form = offcanvasEl.querySelector("#themeForm");
    const saveBtn = offcanvasEl.querySelector("#saveBtn");
    const clearBtn = offcanvasEl.querySelector("#clearFormBtn");
    const riskCards = offcanvasEl.querySelectorAll(".risk-card-option");
    const riskInput = offcanvasEl.querySelector("#id_risk_rating");

    console.log("AddTheme READY");

    /* SELECT RISK */
    riskCards.forEach(card => {
        card.addEventListener("click", function () {
            riskCards.forEach(c => c.classList.remove("selected"));
            this.classList.add("selected");
            riskInput.value = this.dataset.value;
        });
    });

    /* CLEAR FORM */
    clearBtn.addEventListener("click", () => {
        form.reset();
        riskCards.forEach(c => c.classList.remove("selected"));
        riskInput.value = "";
    });

    /* SAVE → AJAX SUBMIT */
    saveBtn.onclick = () => form.requestSubmit();

    /* SUBMIT HANDLER */
    form.onsubmit = async function (e) {
        e.preventDefault();

        const formData = new FormData(form);

        const response = await fetch(form.action, {
            method: "POST",
            body: formData,
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        const data = await response.json();

        if (data.success) {

            // cerrar form add
            bootstrap.Offcanvas.getInstance(offcanvasEl).hide();

            // abrir offcanvas de detalle
            openThemeDetailOffcanvas(data.theme_id);
        }
    };
});

// =========================================
// UNIVERSAL RISK-RATING HANDLER (ADD + EDIT)
// =========================================
document.addEventListener("click", function (e) {

    const card = e.target.closest(".risk-card-option");
    if (!card) return;

    const offcanvas = card.closest(".offcanvas");
    if (!offcanvas) return;

    const hiddenInput = offcanvas.querySelector("input[name='risk_rating']");
    if (!hiddenInput) return;

    offcanvas.querySelectorAll(".risk-card-option")
        .forEach(c => c.classList.remove("selected"));

    card.classList.add("selected");
    hiddenInput.value = card.dataset.value;
});

function showSuccessMessage(message) {
    const alert = document.createElement("div");

    alert.className = "alert alert-success position-fixed top-0 end-0 m-3 shadow";
    alert.style.zIndex = 9999;
    alert.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.classList.add("fade");
        alert.style.opacity = "0";
    }, 2000);

    setTimeout(() => alert.remove(), 2600);
}
