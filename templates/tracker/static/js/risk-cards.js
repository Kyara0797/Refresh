console.log(" risk-cards.js LOADED");

document.addEventListener('click', function (e) {
    const card = e.target.closest('.risk-card');
    if (!card) return;

    console.log(" CLICK EN RISK CARD");

    const riskInput = document.getElementById('id_risk_rating');
    if (!riskInput) {
        console.error(" Hidden input id_risk_rating NOT FOUND");
        return;
    }

    const value = card.dataset.risk;
    console.log("Selected risk:", value);

    document.querySelectorAll('.risk-card.selected')
        .forEach(c => c.classList.remove('selected'));

    card.classList.add('selected');
    riskInput.value = value;

    console.log(" Hidden input updated:", riskInput.value);
});
