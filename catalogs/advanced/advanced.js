
"use strict";

/* ======================================== */
/* SUMMIT FLOORING CATALOG ENGINE           */
/* ======================================== */

let products = [];
let collections = [];
let currentPage = 1;
let quoteList = new Map();
let compareList = new Set();
let toastTimer;

const pageSize = 12;
const storageKey = "summit-demo-quote-v1";

const filters = {
    category: new Set(),
    color: new Set(),
    material: new Set(),
    application: new Set(),
    finish: new Set()
};

const $ = id => document.getElementById(id);


/* ======================================== */
/* INITIALIZATION                           */
/* ======================================== */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch("./products.json");

        if (!response.ok) {
            throw new Error("Unable to load product database.");
        }

        const database = await response.json();

        collections = database.collections;

        products = collections.flatMap(collection =>

            collection.models.flatMap(model =>

                collection.colors.map(color => ({

                    sku: `${collection.code}-${model.id}-${color.code}`,

                    name: model.name,
                    category: collection.name,
                    material: collection.material,
                    application: collection.application,
                    texture: collection.texture,

                    color: color.name,
                    hex: color.hex,

                    size: model.size,
                    thickness: model.thickness,
                    coverage: model.coverage,
                    finish: model.finish,

                    image: `images/${collection.code.toLowerCase()}-${model.id}-${color.code.toLowerCase()}.jpg`

                }))

            )

        );

        restoreQuote();
        createCollections();
        createFilters();
        populateCalculator();
        bindEvents();
        renderProducts();
        updateQuoteCount();

    } catch (error) {

        console.error("Summit catalog error:", error);

        $("results-count").textContent =
            "Unable to load the product catalog.";

    }

});


/* ======================================== */
/* SAFE TEXT                                */
/* ======================================== */

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );

}

const moneylessNumber = value =>
    Number(value).toLocaleString("en-US", {
        maximumFractionDigits: 2
    });


/* ======================================== */
/* PROCEDURAL MATERIAL TEXTURES             */
/* ======================================== */

function materialIllustration(product) {

    const color = /^#[0-9a-f]{6}$/i.test(product.hex)
        ? product.hex
        : "#BCA68F";

    let hash = 0;

    for (const char of product.sku) {
        hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    }

    let seed = hash >>> 0;

    function random() {

        seed = (seed * 1664525 + 1013904223) >>> 0;

        return seed / 4294967296;

    }

    let texture = "";

    if (product.texture === "wood") {

        for (let plank = 0; plank < 6; plank++) {

            const y = plank * 40;

            texture += `
                <rect x="0" y="${y}"
                    width="360" height="40"
                    fill="${color}"/>

                <rect x="0" y="${y}"
                    width="360" height="40"
                    fill="${plank % 2 ? "#fff" : "#000"}"
                    opacity="${0.05 + random() * 0.10}"/>

                <path d="M0 ${y} H360"
                    stroke="#000" stroke-opacity=".22"/>
            `;

            for (let grain = 0; grain < 18; grain++) {

                const gy = y + random() * 40;
                const curve = 4 + random() * 11;

                texture += `
                    <path
                        d="M-10 ${gy}
                        Q90 ${gy + curve} 180 ${gy}
                        T370 ${gy + curve}"
                        fill="none"
                        stroke="#30261C"
                        stroke-width="${0.5 + random()}"
                        opacity="${0.05 + random() * 0.17}"/>
                `;

            }

            const joint = 70 + random() * 230;

            texture += `
                <path d="M${joint} ${y} v40"
                    stroke="#000"
                    stroke-opacity=".2"/>
            `;

        }

    } else if (product.texture === "stone") {

        for (let i = 0; i < 28; i++) {

            const x = random() * 360;
            const y = random() * 240;

            texture += `
                <path
                    d="M${x - 120} ${y - 170}
                    Q${x + 90} ${y - 40} ${x} ${y}
                    T${x + 120} ${y + 170}"
                    fill="none"
                    stroke="${i % 2 ? "#fff" : "#555"}"
                    stroke-width="${0.5 + random() * 3}"
                    opacity="${0.03 + random() * 0.14}"/>
            `;

        }

        texture += `
            <path d="M180 0 V240 M0 120 H360"
                stroke="#fff"
                stroke-opacity=".45"
                stroke-width="2"/>
        `;

    } else {

        for (let row = 0; row < 4; row++) {

            for (let col = -1; col < 4; col++) {

                const x = col * 120 +
                    (row % 2 ? 60 : 0);

                texture += `
                    <rect
                        x="${x}"
                        y="${row * 60}"
                        width="118"
                        height="58"
                        rx="2"
                        fill="${color}"/>

                    <rect
                        x="${x}"
                        y="${row * 60}"
                        width="118"
                        height="58"
                        fill="#fff"
                        opacity="${random() * 0.12}"/>
                `;

            }

        }

    }

    return `

        <svg viewBox="0 0 360 240"
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label="${escapeHTML(product.name)} material illustration"
            xmlns="http://www.w3.org/2000/svg">

            <rect width="360" height="240"
                fill="${product.texture === "ceramic"
                    ? "#F0F0EA"
                    : color}"/>

            ${texture}

        </svg>

    `;

}


function imageMarkup(product) {

    const photo = product.image
        ? `<img
            src="${escapeHTML(product.image)}"
            alt="${escapeHTML(product.name)} in ${escapeHTML(product.color)}"
            hidden loading="lazy">`
        : "";

    return `

        <div class="product-image">

            ${materialIllustration(product)}

            ${photo}

        </div>

    `;

}


/* Product photography can be enabled later by
   adding image files and calling activateImages(). */

function activateImages(container) {

    container.querySelectorAll("img").forEach(img => {

        const showImage = () => {

            img.hidden = false;

            const illustration =
                img.parentElement.querySelector("svg");

            if (illustration) {
                illustration.hidden = true;
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
/* COLLECTION CARDS                         */
/* ======================================== */

function createCollections() {

    $("collection-grid").innerHTML =
        collections.map(collection => {

            const product = products.find(
                item => item.category === collection.name
            );

            const count = products.filter(
                item => item.category === collection.name
            ).length;

            return `

                <button class="collection-card"
                    data-collection="${escapeHTML(collection.name)}"
                    type="button">

                    ${materialIllustrationImage(product)}

                    <div class="collection-card-content">

                        <strong>
                            ${escapeHTML(collection.name)}
                        </strong>

                        <small>
                            ${count} products &rarr;
                        </small>

                    </div>

                </button>

            `;

        }).join("");

}


function materialIllustrationImage(product) {

    return `
        <div class="product-image">
            ${materialIllustration(product)}
        </div>
    `;

}


/* ======================================== */
/* DYNAMIC FILTERS                          */
/* ======================================== */

function productValues(product, key) {

    return Array.isArray(product[key])
        ? product[key]
        : [product[key]];

}


function createFilters() {

    Object.keys(filters).forEach(key => {

        const values = [...new Set(

            products.flatMap(product =>
                productValues(product, key)
            )

        )].sort();

        $(`${key}-filters`).innerHTML =
            values.map(value => {

                const count = products.filter(product =>
                    productValues(product, key).includes(value)
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


function getFilteredProducts() {

    const search = $("product-search")
        .value.trim().toLowerCase();

    const results = products.filter(product => {

        const text = [

            product.sku,
            product.name,
            product.category,
            product.material,
            product.color,
            product.finish,
            product.application.join(" "),
            product.size

        ].join(" ").toLowerCase();

        if (!text.includes(search)) {
            return false;
        }

        return Object.entries(filters).every(
            ([key, values]) =>

                values.size === 0 ||

                productValues(product, key)
                    .some(value => values.has(value))

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

        case "thickness":

            results.sort((a, b) =>
                a.thickness - b.thickness);

            break;

    }

    return results;

}


/* ======================================== */
/* RENDER PRODUCT CARDS                     */
/* ======================================== */

function renderProducts() {

    const results = getFilteredProducts();

    const pageCount = Math.max(
        1,
        Math.ceil(results.length / pageSize)
    );

    currentPage = Math.min(currentPage, pageCount);

    const start = (currentPage - 1) * pageSize;

    const visible = results.slice(start, start + pageSize);

    $("results-count").textContent = results.length
        ? `Showing ${start + 1}–${start + visible.length} of ${results.length} products`
        : "No products found";

    $("empty-state").hidden = results.length > 0;

    $("product-grid").innerHTML = visible.map(product => `

        <article class="product-card">

            ${materialIllustrationImage(product)}

            <div class="product-info">

                <p class="product-category">
                    ${escapeHTML(product.category)}
                </p>

                <p class="product-sku">
                    ${escapeHTML(product.sku)}
                </p>

                <h3>${escapeHTML(product.name)}</h3>

                <p class="product-subtitle">

                    ${escapeHTML(product.color)}
                    &bull;
                    ${escapeHTML(product.size)}

                </p>

                <p class="product-subtitle">

                    ${product.thickness} mm
                    &bull;
                    ${escapeHTML(product.finish)}

                </p>

                <p class="product-availability">
                    Wholesale pricing available upon request
                </p>

                <div class="product-actions">

                    <button class="button secondary"
                        data-details="${product.sku}"
                        type="button">

                        View Specifications

                    </button>

                    <button class="button primary"
                        data-add="${product.sku}"
                        type="button">

                        ${quoteList.has(product.sku)
                            ? "Added to Quote ✓"
                            : "Add to Quote"}

                    </button>

                    <button class="compare-button
                        ${compareList.has(product.sku)
                            ? "selected"
                            : ""}"
                        data-compare="${product.sku}"
                        aria-pressed="${compareList.has(product.sku)}"
                        type="button">

                        ${compareList.has(product.sku)
                            ? "Selected for Comparison ✓"
                            : "+ Compare Product"}

                    </button>

                </div>

            </div>

        </article>

    `).join("");

    renderPagination(pageCount, results.length);

}


/* ======================================== */
/* PAGINATION                               */
/* ======================================== */

function renderPagination(pageCount, totalProducts) {

    if (pageCount <= 1 || totalProducts === 0) {

        $("pagination").innerHTML = "";

        return;

    }

    let markup = `

        <button data-page="${currentPage - 1}"
            type="button"
            ${currentPage === 1 ? "disabled" : ""}>

            &larr; Previous

        </button>

    `;

    for (let page = 1; page <= pageCount; page++) {

        markup += `

            <button data-page="${page}"
                type="button"
                ${page === currentPage
                    ? 'aria-current="page"'
                    : ""}>

                ${page}

            </button>

        `;

    }

    markup += `

        <button data-page="${currentPage + 1}"
            type="button"
            ${currentPage === pageCount ? "disabled" : ""}>

            Next &rarr;

        </button>

    `;

    $("pagination").innerHTML = markup;

}


/* ======================================== */
/* PRODUCT SPECIFICATIONS                   */
/* ======================================== */

function getSpecifications(product) {

    return [

        ["Product Number", product.sku],
        ["Collection", product.category],
        ["Material", product.material],
        ["Color", product.color],
        ["Dimensions", product.size],
        ["Thickness", `${product.thickness} mm`],
        ["Surface Finish", product.finish],

        ["Carton Coverage",
            `${product.coverage} sq. ft.`],

        ["Application",
            product.application.join(", ")],

        ["Pricing", "Request a wholesale quote"]

    ];

}


function openProduct(sku) {

    const product = products.find(
        item => item.sku === sku
    );

    if (!product) return;

    $("product-modal-content").innerHTML = `

        <div class="modal-product-layout">

            ${materialIllustrationImage(product)}

            <div>

                <p class="product-sku">
                    ${escapeHTML(product.sku)}
                </p>

                <h2>${escapeHTML(product.name)}</h2>

                <p>
                    ${escapeHTML(product.color)}
                    &bull;
                    ${escapeHTML(product.category)}
                </p>

                <table class="spec-table">

                    <tbody>

                        ${getSpecifications(product)
                            .map(([label, value]) => `

                                <tr>
                                    <th scope="row">
                                        ${escapeHTML(label)}
                                    </th>

                                    <td>${escapeHTML(value)}</td>
                                </tr>

                            `).join("")}

                    </tbody>

                </table>

                <div class="modal-actions">

                    <button class="button primary"
                        data-add="${product.sku}"
                        type="button">

                        ${quoteList.has(product.sku)
                            ? "Added to Quote ✓"
                            : "Add to Quote"}

                    </button>

                    <button class="button secondary"
                        data-download="${product.sku}"
                        type="button">

                        Download Specification Sheet

                    </button>

                    <button class="button secondary"
                        data-calculate="${product.sku}"
                        type="button">

                        Calculate Project Requirements

                    </button>

                    <button class="compare-button"
                        data-compare="${product.sku}"
                        type="button"
                        aria-pressed="${compareList.has(product.sku)}">

                        ${compareList.has(product.sku)
                            ? "Selected for Comparison ✓"
                            : "+ Compare Product"}

                    </button>

                </div>

            </div>

        </div>

    `;

    $("product-modal").showModal();

}


/* ======================================== */
/* DOWNLOADABLE SPECIFICATION SHEETS       */
/* ======================================== */

function downloadSpecification(sku) {

    const product = products.find(
        item => item.sku === sku
    );

    if (!product) return;

    const content = [

        "SUMMIT FLOORING SUPPLY",
        "PRODUCT TECHNICAL SPECIFICATION",
        "======================================",
        "",
        product.name,
        "",

        ...getSpecifications(product).map(
            ([label, value]) => `${label}: ${value}`
        ),

        "",
        "======================================",
        "DEMONSTRATION PRODUCT",
        "Specifications are fictional and illustrative.",
        "Designed by GJP Web Design & Development"

    ].join("\n");

    const blob = new Blob([content], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `${product.sku}-specifications.txt`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    notify("Specification sheet generated.");

}


/* ======================================== */
/* PRODUCT COMPARISON                       */
/* ======================================== */

function toggleComparison(sku) {

    if (compareList.has(sku)) {

        compareList.delete(sku);

    } else {

        if (compareList.size >= 3) {

            notify("You can compare up to three products.");

            return;

        }

        compareList.add(sku);

    }

    renderProducts();
    updateComparison();

}


function updateComparison() {

    $("compare-bar").hidden = compareList.size === 0;

    $("compare-count").textContent =
        `${compareList.size} of 3 selected`;

    $("open-compare").disabled = compareList.size < 2;

    document.body.classList.toggle(
        "has-comparison",
        compareList.size > 0
    );

    $("product-modal-content")
        .querySelectorAll("[data-compare]")
        .forEach(button => {

            const selected =
                compareList.has(button.dataset.compare);

            button.setAttribute("aria-pressed", String(selected));

            button.textContent = selected
                ? "Selected for Comparison ✓"
                : "+ Compare Product";

        });

}


function openComparison() {

    const selected = products.filter(
        product => compareList.has(product.sku)
    );

    if (selected.length < 2) return;

    const labels = [

        "Product Number",
        "Collection",
        "Material",
        "Color",
        "Dimensions",
        "Thickness",
        "Surface Finish",
        "Carton Coverage",
        "Application"

    ];

    $("compare-content").innerHTML = `

        <div class="comparison-scroll">

            <table class="comparison-table">

                <thead>

                    <tr>

                        <th scope="col">Specification</th>

                        ${selected.map(product => `

                            <th scope="col">

                                ${materialIllustrationImage(product)}

                                ${escapeHTML(product.name)}

                            </th>

                        `).join("")}

                    </tr>

                </thead>

                <tbody>

                    ${labels.map((label, index) => `

                        <tr>

                            <th scope="row">
                                ${escapeHTML(label)}
                            </th>

                            ${selected.map(product => `

                                <td>
                                    ${escapeHTML(
                                        getSpecifications(product)[index][1]
                                    )}
                                </td>

                            `).join("")}

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

    $("compare-modal").showModal();

}


/* ======================================== */
/* PROJECT CALCULATOR                       */
/* ======================================== */

function populateCalculator() {

    $("calculator-product").innerHTML = `

        <option value="">Select a product</option>

        ${products.map(product => `

            <option value="${product.sku}">

                ${escapeHTML(product.name)}
                -
                ${escapeHTML(product.color)}
                (${product.sku})

            </option>

        `).join("")}

    `;

}


function calculateProject(event) {

    event.preventDefault();

    const product = products.find(
        item => item.sku === $("calculator-product").value
    );

    if (!product) return;

    const length = Number($("room-length").value);

    const width = Number($("room-width").value);

    const waste = Number($("waste-percentage").value);

    const area = length * width;

    const required = area * (1 + waste / 100);

    const cartons = Math.ceil(required / product.coverage);

    const actualCoverage = cartons * product.coverage;

    $("calculator-result").innerHTML = `

        <h3>Your Project Estimate</h3>

        <p>${escapeHTML(product.name)}
            - ${escapeHTML(product.color)}</p>

        <dl>

            <div>
                <dt>Room Area</dt>
                <dd>${moneylessNumber(area)} sq. ft.</dd>
            </div>

            <div>
                <dt>Waste Allowance</dt>
                <dd>${waste}%</dd>
            </div>

            <div>
                <dt>Total Required</dt>
                <dd>${moneylessNumber(required)} sq. ft.</dd>
            </div>

            <div>
                <dt>Coverage per Carton</dt>
                <dd>${product.coverage} sq. ft.</dd>
            </div>

            <div>
                <dt>Cartons Required</dt>
                <dd>${moneylessNumber(cartons)}</dd>
            </div>

            <div>
                <dt>Total Carton Coverage</dt>
                <dd>${moneylessNumber(actualCoverage)} sq. ft.</dd>
            </div>

        </dl>

        <button class="button primary"
            data-calculator-add="${product.sku}"
            data-cartons="${cartons}"
            type="button">

            Add ${moneylessNumber(cartons)} Cartons to Quote

        </button>

        <p style="font-size: 0.75rem; margin-top: 12px;">

            Planning estimate only. Verify actual
            material requirements before ordering.

        </p>

    `;

    $("calculator-result").hidden = false;

}


/* ======================================== */
/* PERSISTENT QUOTE LIST                    */
/* ======================================== */

function saveQuote() {

    try {

        localStorage.setItem(

            storageKey,

            JSON.stringify([...quoteList.entries()])

        );

    } catch (error) {

        console.warn("Quote storage unavailable.", error);

    }

}


function restoreQuote() {

    try {

        const stored = JSON.parse(
            localStorage.getItem(storageKey) || "[]"
        );

        if (!Array.isArray(stored)) return;

        quoteList = new Map(

            stored.filter(entry =>

                Array.isArray(entry) &&

                products.some(product =>
                    product.sku === entry[0]
                ) &&

                Number.isSafeInteger(entry[1]) &&

                entry[1] > 0 &&

                entry[1] <= 10000000000

            )

        );

    } catch (error) {

        quoteList = new Map();

    }

}


function addToQuote(sku, quantity = 1, replace = false) {

    if (!products.some(product => product.sku === sku)) {
        return;
    }

    if (!quoteList.has(sku) || replace) {

        quoteList.set(sku, quantity);

    }

    saveQuote();
    updateQuoteCount();
    renderProducts();

    $("product-modal-content")
        .querySelectorAll("[data-add]")
        .forEach(button => {

            if (button.dataset.add === sku) {

                button.textContent = "Added to Quote ✓";

            }

        });

    if ($("quote-modal").open) {
        renderQuote();
    }

    notify("Product added to your quote list.");

}


function updateQuoteCount() {

    $("quote-count").textContent = quoteList.size;

}


function renderQuote() {

    const entries = [...quoteList.entries()];

    $("quote-items").innerHTML = entries.length

        ? entries.map(([sku, quantity]) => {

            const product = products.find(
                item => item.sku === sku
            );

            return `

                <div class="quote-item">

                    <div>

                        <strong>
                            ${escapeHTML(product.name)}
                        </strong>

                        <p class="product-sku">

                            ${escapeHTML(product.sku)}
                            &bull;
                            ${escapeHTML(product.color)}

                        </p>

                        <small>

                            ${product.coverage} sq. ft.
                            per carton

                        </small>

                    </div>

                    <label>

                        Cartons

                        <input type="number"
                            min="1"
                            max="10000000000"
                            step="1"
                            value="${quantity}"
                            data-quantity="${sku}"
                            aria-label="Cartons for ${sku}">

                    </label>

                    <button class="text-button"
                        data-remove="${sku}"
                        type="button">

                        Remove

                    </button>

                </div>

            `;

        }).join("")

        : "<p>Your quote list is empty.</p>";

    $("quote-form").hidden = entries.length === 0;

    $("quote-confirmation").hidden = true;

}


/* ======================================== */
/* QUOTE REQUEST PREVIEW                    */
/* ======================================== */

function previewQuote(event) {

    event.preventDefault();

    if (!quoteList.size) return;

    $("quote-confirmation").innerHTML = `

        <h3>Wholesale Quote Preview</h3>

        <p>
            Prepared for
            ${escapeHTML($("quote-name").value)}
            at
            ${escapeHTML($("quote-company").value)}.
        </p>

        <ul>

            ${[...quoteList.entries()].map(([sku, quantity]) => {

                const product = products.find(
                    item => item.sku === sku
                );

                return `

                    <li>

                        ${escapeHTML(product.name)}
                        (${escapeHTML(sku)})

                        &mdash;

                        ${moneylessNumber(quantity)} cartons

                    </li>

                `;

            }).join("")}

        </ul>

        <p>
            This is a demonstration.
            No request has been transmitted.
        </p>

    `;

    $("quote-confirmation").hidden = false;

}


/* ======================================== */
/* NOTIFICATIONS                            */
/* ======================================== */

function notify(message) {

    clearTimeout(toastTimer);

    $("toast").textContent = message;

    $("toast").hidden = false;

    toastTimer = setTimeout(() => {

        $("toast").hidden = true;

    }, 3000);

}


/* ======================================== */
/* RESET AND NAVIGATION                     */
/* ======================================== */

function resetFilters() {

    Object.values(filters).forEach(set => set.clear());

    document.querySelectorAll("[data-filter]")
        .forEach(input => input.checked = false);

    $("product-search").value = "";

    $("product-sort").value = "default";

    currentPage = 1;

    renderProducts();

}


function scrollToSection(id) {

    $(id).scrollIntoView({

        behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches ? "auto" : "smooth"

    });

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


    $("grid-view").addEventListener("click", () => {

        $("product-grid").classList.remove("list-view");

        $("grid-view").classList.add("active");

        $("list-view").classList.remove("active");

        $("grid-view").setAttribute("aria-pressed", "true");

        $("list-view").setAttribute("aria-pressed", "false");

    });


    $("list-view").addEventListener("click", () => {

        $("product-grid").classList.add("list-view");

        $("list-view").classList.add("active");

        $("grid-view").classList.remove("active");

        $("list-view").setAttribute("aria-pressed", "true");

        $("grid-view").setAttribute("aria-pressed", "false");

    });


    $("clear-compare").addEventListener("click", () => {

        compareList.clear();

        updateComparison();

        renderProducts();

    });


    $("open-compare").addEventListener(
        "click", openComparison
    );


    $("open-quote").addEventListener("click", () => {

        renderQuote();

        $("quote-modal").showModal();

    });


    $("calculator-form").addEventListener(
        "submit", calculateProject
    );


    $("calculator-form").addEventListener("input", () => {

        $("calculator-result").hidden = true;

    });


    $("quote-form").addEventListener(
        "submit", previewQuote
    );


    document.addEventListener("change", event => {

        const input = event.target;

        if (input.matches("[data-filter]")) {

            const group = filters[input.dataset.filter];

            if (input.checked) {

                group.add(input.value);

            } else {

                group.delete(input.value);

            }

            currentPage = 1;

            renderProducts();

        }


        if (input.matches("[data-quantity]")) {

            const sku = input.dataset.quantity;

            if (!quoteList.has(sku)) return;

            const quantity = Math.min(

                10000000000,

                Math.max(
                    1,
                    Math.floor(Number(input.value) || 1)
                )

            );

            quoteList.set(sku, quantity);

            input.value = quantity;

            saveQuote();

            $("quote-confirmation").hidden = true;

        }

    });


    document.addEventListener("click", event => {

        const button = event.target.closest("button");

        if (!button || button.disabled) return;


        if (button.dataset.close) {

            $(button.dataset.close).close();

        }


        if (button.dataset.details) {

            openProduct(button.dataset.details);

        }


        if (button.dataset.add) {

            addToQuote(button.dataset.add);

        }


        if (button.dataset.compare) {

            toggleComparison(button.dataset.compare);

        }


        if (button.dataset.download) {

            downloadSpecification(button.dataset.download);

        }


        if (button.dataset.remove) {

            quoteList.delete(button.dataset.remove);

            saveQuote();

            updateQuoteCount();

            renderQuote();

            renderProducts();

        }


        if (button.dataset.page) {

            currentPage = Number(button.dataset.page);

            renderProducts();

            scrollToSection("catalog");

        }


        if (button.dataset.collection) {

            resetFilters();

            const category = button.dataset.collection;

            filters.category.add(category);

            document.querySelectorAll(
                '[data-filter="category"]'
            ).forEach(input => {

                input.checked = input.value === category;

            });

            renderProducts();

            scrollToSection("catalog");

        }


        if (button.dataset.calculate) {

            $("calculator-product").value =
                button.dataset.calculate;

            $("calculator-result").hidden = true;

            $("product-modal").close();

            scrollToSection("calculator");

        }


        if (button.dataset.calculatorAdd) {

            addToQuote(

                button.dataset.calculatorAdd,

                Number(button.dataset.cartons),

                true

            );

        }

    });

}
