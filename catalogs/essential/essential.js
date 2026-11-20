
"use strict";

/* ======================================== */
/* CATALOG STATE                            */
/* ======================================== */

let products = [];
let quoteList = new Map();
let currentPage = 1;

const pageSize = 12;

const selectedFilters = {
    category: new Set(),
    finish: new Set(),
    material: new Set()
};

const $ = (id) => document.getElementById(id);


/* ======================================== */
/* INITIALIZATION                           */
/* ======================================== */

document.addEventListener("DOMContentLoaded", async () => {

    bindEvents();

    try {

        const response = await fetch("./products.json");

        if (!response.ok) {
            throw new Error("Unable to load products.");
        }

        const database = await response.json();

        products = database.models.flatMap(model =>
            database.finishes.map(finish => ({

                sku: `${model.id}-${finish.code}`,
                name: model.name,
                category: model.category,
                finish: finish.name,
                color: finish.color,
                material: model.material,
                size: model.size,
                image: `images/${model.image}-${finish.code.toLowerCase()}.jpg`

            }))
        );

        createFilters();
        renderProducts();

    } catch (error) {

        console.error("Catalog error:", error);

        $("results-count").textContent =
            "Unable to load the product catalog.";

    }

});


/* ======================================== */
/* SAFE TEXT RENDERING                      */
/* ======================================== */

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );

}


/* ======================================== */
/* PRODUCT ILLUSTRATION FALLBACK            */
/* ======================================== */

function productIllustration(product) {

    const color = /^#[0-9a-f]{6}$/i.test(product.color)
        ? product.color
        : "#B99A62";

    let shape;

    switch (product.category) {

        case "Cabinet Knobs":

            shape = `
                <rect x="144" y="85" width="32" height="76"
                    rx="8" fill="${color}"/>
                <circle cx="160" cy="80" r="48"
                    fill="${color}" stroke="#000"
                    stroke-opacity=".15" stroke-width="2"/>
                <ellipse cx="150" cy="65" rx="28" ry="15"
                    fill="#fff" opacity=".18"/>
            `;

            break;

        case "Cabinet Hinges":

            shape = `
                <rect x="70" y="46" width="85" height="138"
                    rx="8" fill="${color}"/>
                <rect x="165" y="46" width="85" height="138"
                    rx="8" fill="${color}"/>
                <rect x="150" y="42" width="20" height="146"
                    rx="6" fill="${color}"
                    stroke="#000" stroke-opacity=".2"/>
                <g fill="#555" opacity=".6">
                    <circle cx="95" cy="72" r="7"/>
                    <circle cx="95" cy="158" r="7"/>
                    <circle cx="225" cy="72" r="7"/>
                    <circle cx="225" cy="158" r="7"/>
                </g>
            `;

            break;

        case "Edge Pulls":

            shape = `
                <rect x="55" y="70" width="210" height="85"
                    rx="6" fill="${color}"/>
                <rect x="55" y="130" width="210" height="25"
                    rx="3" fill="#000" opacity=".18"/>
                <rect x="75" y="77" width="170" height="5"
                    rx="2" fill="#fff" opacity=".3"/>
            `;

            break;

        case "Cabinet Accessories":

            shape = `
                <rect x="105" y="45" width="110" height="140"
                    rx="20" fill="${color}"/>
                <circle cx="160" cy="115" r="37"
                    fill="none" stroke="#fff"
                    stroke-opacity=".25" stroke-width="10"/>
            `;

            break;

        default:

            shape = `
                <rect x="67" y="96" width="25" height="67"
                    rx="5" fill="${color}"/>
                <rect x="228" y="96" width="25" height="67"
                    rx="5" fill="${color}"/>
                <rect x="40" y="78" width="240" height="32"
                    rx="12" fill="${color}"/>
                <rect x="55" y="82" width="210" height="6"
                    rx="3" fill="#fff" opacity=".25"/>
            `;

    }

    return `
        <svg viewBox="0 0 320 230"
            role="img"
            aria-label="${escapeHTML(product.name)} illustration"
            xmlns="http://www.w3.org/2000/svg">

            <ellipse cx="160" cy="195" rx="115" ry="10"
                fill="#000" opacity=".08"/>

            ${shape}

        </svg>
    `;

}


function imageMarkup(product) {

    return `
        <div class="product-image">

            ${productIllustration(product)}

            <img
                src="${escapeHTML(product.image)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy"
                hidden>

        </div>
    `;

}


function activateImages(container) {

    container.querySelectorAll(".product-image img")
        .forEach(img => {

            const showImage = () => {

                img.hidden = false;

                const svg = img.parentElement.querySelector("svg");

                if (svg) {
                    svg.style.display = "none";
                }

            };

            img.addEventListener("load", showImage);

            img.addEventListener("error", () => {
                img.hidden = true;
            });

            if (img.complete && img.naturalWidth > 0) {
                showImage();
            }

        });

}


/* ======================================== */
/* FILTER GENERATION                        */
/* ======================================== */

function createFilters() {

    const groups = [
        ["category", "category-filters"],
        ["finish", "finish-filters"],
        ["material", "material-filters"]
    ];

    groups.forEach(([key, containerId]) => {

        const values = [...new Set(
            products.map(product => product[key])
        )].sort();

        const container = $(containerId);

        container.innerHTML = values.map(value => {

            const count = products.filter(
                product => product[key] === value
            ).length;

            return `
                <label class="filter-option">

                    <input type="checkbox"
                        data-filter="${key}"
                        value="${escapeHTML(value)}">

                    <span>
                        ${escapeHTML(value)} (${count})
                    </span>

                </label>
            `;

        }).join("");

    });

}


/* ======================================== */
/* FILTER AND SORT PRODUCTS                 */
/* ======================================== */

function getFilteredProducts() {

    const search = $("product-search")
        .value.trim().toLowerCase();

    let results = products.filter(product => {

        const searchable = [
            product.name,
            product.sku,
            product.category,
            product.finish,
            product.material
        ].join(" ").toLowerCase();

        if (!searchable.includes(search)) {
            return false;
        }

        return Object.entries(selectedFilters)
            .every(([key, values]) =>
                values.size === 0 ||
                values.has(product[key])
            );

    });

    switch ($("product-sort").value) {

        case "name-asc":
            results.sort((a, b) =>
                a.name.localeCompare(b.name));
            break;

        case "name-desc":
            results.sort((a, b) =>
                b.name.localeCompare(a.name));
            break;

        case "sku":
            results.sort((a, b) =>
                a.sku.localeCompare(b.sku));
            break;

    }

    return results;

}


/* ======================================== */
/* PRODUCT CARD RENDERING                   */
/* ======================================== */

function renderProducts() {

    const results = getFilteredProducts();

    const totalPages = Math.max(
        1,
        Math.ceil(results.length / pageSize)
    );

    currentPage = Math.min(currentPage, totalPages);

    const first = (currentPage - 1) * pageSize;

    const visible = results.slice(
        first,
        first + pageSize
    );

    $("results-count").textContent = results.length
        ? `Showing ${first + 1}–${first + visible.length} of ${results.length} products`
        : "0 products found";

    $("empty-state").hidden = results.length > 0;

    $("product-grid").innerHTML = visible.map(product => `

        <article class="product-card">

            ${imageMarkup(product)}

            <div class="product-info">

                <p class="product-sku">
                    ${escapeHTML(product.sku)}
                </p>

                <h3>${escapeHTML(product.name)}</h3>

                <p class="product-finish">
                    ${escapeHTML(product.finish)}
                    &bull;
                    ${escapeHTML(product.size)}
                </p>

                <div class="product-actions">

                    <button type="button"
                        data-details="${escapeHTML(product.sku)}">

                        View Details

                    </button>

                    <button type="button"
                        data-add="${escapeHTML(product.sku)}">

                        ${quoteList.has(product.sku)
                            ? "Added to Quote ✓"
                            : "Add to Quote"}

                    </button>

                </div>

            </div>

        </article>

    `).join("");

    activateImages($("product-grid"));

    renderPagination(totalPages, results.length);

}


/* ======================================== */
/* PAGINATION                               */
/* ======================================== */

function renderPagination(totalPages, totalProducts) {

    const container = $("pagination");

    if (totalProducts === 0 || totalPages <= 1) {

        container.innerHTML = "";
        return;

    }

    let markup = `
        <button type="button"
            data-page="${currentPage - 1}"
            ${currentPage === 1 ? "disabled" : ""}>

            &larr; Previous

        </button>
    `;

    for (let page = 1; page <= totalPages; page++) {

        markup += `
            <button type="button"
                data-page="${page}"
                ${page === currentPage
                    ? 'aria-current="page"'
                    : ""}>

                ${page}

            </button>
        `;

    }

    markup += `
        <button type="button"
            data-page="${currentPage + 1}"
            ${currentPage === totalPages ? "disabled" : ""}>

            Next &rarr;

        </button>
    `;

    container.innerHTML = markup;

}


/* ======================================== */
/* PRODUCT DETAILS                          */
/* ======================================== */

function openProduct(sku) {

    const product = products.find(item => item.sku === sku);

    if (!product) return;

    $("product-modal-content").innerHTML = `

        <div class="modal-product-layout">

            ${imageMarkup(product)}

            <div>

                <p class="product-sku">
                    ${escapeHTML(product.sku)}
                </p>

                <h2>${escapeHTML(product.name)}</h2>

                <p>
                    Professional cabinet hardware for
                    residential and commercial projects.
                </p>

                <table class="spec-table">

                    <tbody>

                        <tr>
                            <th scope="row">Product Number</th>
                            <td>${escapeHTML(product.sku)}</td>
                        </tr>

                        <tr>
                            <th scope="row">Category</th>
                            <td>${escapeHTML(product.category)}</td>
                        </tr>

                        <tr>
                            <th scope="row">Finish</th>
                            <td>${escapeHTML(product.finish)}</td>
                        </tr>

                        <tr>
                            <th scope="row">Material</th>
                            <td>${escapeHTML(product.material)}</td>
                        </tr>

                        <tr>
                            <th scope="row">Nominal Size</th>
                            <td>${escapeHTML(product.size)}</td>
                        </tr>

                        <tr>
                            <th scope="row">Pricing</th>
                            <td>Request a quote</td>
                        </tr>

                    </tbody>

                </table>

                <button type="button"
                    class="button button-primary"
                    data-add="${escapeHTML(sku)}">

                    ${quoteList.has(sku)
                        ? "Added to Quote ✓"
                        : "Add to Quote"}

                </button>

            </div>

        </div>

    `;

    activateImages($("product-modal-content"));

    $("product-modal").showModal();

}


/* ======================================== */
/* QUOTE LIST                               */
/* ======================================== */

function addToQuote(sku) {

    const product = products.find(item => item.sku === sku);

    if (!product || quoteList.has(sku)) return;

    quoteList.set(sku, {

        product,
        quantity: 1

    });

    updateQuoteCount();
    renderProducts();

    $("product-modal-content")
        .querySelectorAll("[data-add]")
        .forEach(button => {

            if (button.dataset.add === sku) {
                button.textContent = "Added to Quote ✓";
            }

        });

}


function updateQuoteCount() {

    $("quote-count").textContent = quoteList.size;

}


function renderQuote() {

    const entries = [...quoteList.values()];

    $("quote-items").innerHTML = entries.length
        ? entries.map(({ product, quantity }) => `

            <div class="quote-item">

                <div>

                    <strong>
                        ${escapeHTML(product.name)}
                    </strong>

                    <p class="product-sku">
                        ${escapeHTML(product.sku)}
                        &bull;
                        ${escapeHTML(product.finish)}
                    </p>

                </div>

                <input type="number"
                    min="1"
                    max="100000"
                    value="${quantity}"
                    data-quantity="${escapeHTML(product.sku)}"
                    aria-label="Quantity for ${escapeHTML(product.sku)}">

                <button type="button"
                    data-remove="${escapeHTML(product.sku)}">

                    Remove

                </button>

            </div>

        `).join("")

        : "<p>Your quote list is currently empty.</p>";

    $("quote-form").hidden = entries.length === 0;

}


/* ======================================== */
/* RESET FILTERS                            */
/* ======================================== */

function resetFilters() {

    Object.values(selectedFilters)
        .forEach(set => set.clear());

    document.querySelectorAll("[data-filter]")
        .forEach(input => input.checked = false);

    $("product-search").value = "";

    $("product-sort").value = "default";

    currentPage = 1;

    renderProducts();

}


/* ======================================== */
/* EVENT LISTENERS                          */
/* ======================================== */

function bindEvents() {

    $("product-search").addEventListener("input", () => {

        currentPage = 1;
        renderProducts();

    });

    $("clear-search").addEventListener("click", () => {

        $("product-search").value = "";
        currentPage = 1;
        renderProducts();

    });

    $("product-sort").addEventListener("change", () => {

        currentPage = 1;
        renderProducts();

    });

    $("reset-filters").addEventListener("click", resetFilters);

    $("empty-reset").addEventListener("click", resetFilters);

    $("open-quote").addEventListener("click", () => {

        renderQuote();

        $("quote-confirmation").hidden = true;

        $("quote-modal").showModal();

    });

    $("close-quote").addEventListener("click", () => {
        $("quote-modal").close();
    });

    $("close-product").addEventListener("click", () => {
        $("product-modal").close();
    });


    document.addEventListener("change", event => {

        const input = event.target;

        if (input.matches("[data-filter]")) {

            const group = selectedFilters[input.dataset.filter];

            if (input.checked) {
                group.add(input.value);
            } else {
                group.delete(input.value);
            }

            currentPage = 1;

            renderProducts();

        }

        if (input.matches("[data-quantity]")) {

            const item = quoteList.get(input.dataset.quantity);

            if (!item) return;

            item.quantity = Math.min(
                100000,
                Math.max(1, Math.floor(Number(input.value) || 1))
            );

            input.value = item.quantity;

            $("quote-confirmation").hidden = true;

        }

    });


    document.addEventListener("click", event => {

        const button = event.target.closest("button");

        if (!button || button.disabled) return;

        if (button.dataset.details) {
            openProduct(button.dataset.details);
        }

        if (button.dataset.add) {
            addToQuote(button.dataset.add);
        }

        if (button.dataset.remove) {

            quoteList.delete(button.dataset.remove);

            updateQuoteCount();
            renderQuote();
            renderProducts();

            $("quote-confirmation").hidden = true;

        }

        if (button.dataset.page) {

            currentPage = Number(button.dataset.page);

            renderProducts();

            $("catalog").scrollIntoView({

                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches ? "auto" : "smooth"

            });

        }

    });


    /* Simulated Quote Submission */

    $("quote-form").addEventListener("submit", event => {

        event.preventDefault();

        if (quoteList.size === 0) return;

        const confirmation = $("quote-confirmation");

        confirmation.innerHTML = `

            <h3>Quote Request Preview</h3>

            <p>
                Thank you, ${escapeHTML($("quote-name").value)}.
            </p>

            <p>
                Your request contains ${quoteList.size}
                unique product selections.
            </p>

            <ul>
                ${[...quoteList.values()].map(item => `
                    <li>
                        ${escapeHTML(item.product.sku)}
                        — Quantity: ${item.quantity}
                    </li>
                `).join("")}
            </ul>

            <p>
                This is a demonstration. Your information
                has not been sent or stored on a server.
            </p>

        `;

        confirmation.hidden = false;

    });

}
