function loadOffcanvas(url) {
    const container = document.getElementById("offcanvasContainer");

    // Limpia contenedor sin destruir eventos globales
    container.innerHTML = "";

    // Loader temporal
    const temp = document.createElement("div");
    temp.className = "offcanvas offcanvas-end show";
    temp.style.width = "540px";
    temp.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height:100vh;">
            <div class="spinner-border text-orange"></div>
        </div>
    `;
    container.appendChild(temp);

    const tempCanvas = new bootstrap.Offcanvas(temp);
    tempCanvas.show();

    // Fetch del contenido real
    fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest",credentials: "include" } })
        .then(r => r.text())
        .then(html => {
            
            // Insertamos el HTML real SIN reemplazar el contenedor entero
            container.innerHTML = html;

            // Tomamos el offcanvas recién insertado
            const real = container.querySelector(".offcanvas");

            // Inicializar Bootstrap correctamente
            const oc = new bootstrap.Offcanvas(real);
            oc.show();

            // EJECUTAR Scripts internos correctamente
            real.querySelectorAll("script").forEach(oldScript => {
                const s = document.createElement("script");
                if (oldScript.src) {
                    s.src = oldScript.src;
                } else {
                    s.textContent = oldScript.textContent;
                }
                document.body.appendChild(s);
                document.body.removeChild(s);
            });

            // Cuando cierre → refrescar tablas
            real.addEventListener("hidden.bs.offcanvas", () => {
                if (typeof loadThemesTable === "function") loadThemesTable();
                if (typeof loadEventsTable === "function") loadEventsTable();
                container.innerHTML = "";
            });

        })
        .catch(err => {
            container.innerHTML = `
                <div class="offcanvas offcanvas-end show p-4" style="width:540px;">
                    <h5 class="text-danger fw-bold">Error loading form</h5>
                    <p class="text-muted">${err.message}</p>
                </div>
            `;
        });
}

// =============================
// DATATABLES INIT
// =============================
document.addEventListener("DOMContentLoaded", function () {

    // Threats
    if ($("#themesTable").length) {
        $("#themesTable").DataTable({
            paging: true,
            searching: true,
            info: true,
            autoWidth: false,
            pageLength: 5,
            order: [],
            columnDefs: [{ targets: -1, orderable: false }],
        });
    }

    // Events
    if ($("#eventsTable").length) {
        $("#eventsTable").DataTable({
            paging: true,
            searching: true,
            info: true,
            autoWidth: false,
            pageLength: 5,
            order: [],
            columnDefs: [{ targets: -1, orderable: false }],
        });
    }

    // CLICKABLE ROW
    document.querySelectorAll("tr[data-href]").forEach(row => {
        row.style.cursor = "pointer";
        row.addEventListener("click", e => {
            if (!e.target.closest("a,button,.dropdown")) {
                window.location = row.dataset.href;
            }
        });
    });

    // THREATS ARCHIVED
    const threatsToggle = document.getElementById("toggleThreatsArchived");
    if (threatsToggle) {
        threatsToggle.addEventListener("change", () => {
            const url = new URL(window.location.href);
            threatsToggle.checked ?
                url.searchParams.set("threat_archived", "1") :
                url.searchParams.delete("threat_archived");
            window.location = url.toString();
        });
    }

    // EVENTS ARCHIVED
    const eventsToggle = document.getElementById("toggleEventsArchived");
    if (eventsToggle) {
        eventsToggle.addEventListener("change", () => {
            const url = new URL(window.location.href);
            eventsToggle.checked ?
                url.searchParams.set("event_archived", "1") :
                url.searchParams.delete("event_archived");
            window.location = url.toString();
        });
    }
});

// Evitar que los clicks dentro de dropdowns o botones de tabla
// disparen navegaciones o scroll de DataTables
document.addEventListener("click", function (e) {
    if (e.target.closest(".dropdown")
        || e.target.closest("button")
        || e.target.closest(".btn")
        || e.target.closest(".dataTables_wrapper")) {
        e.stopPropagation();
    }
}, true);
