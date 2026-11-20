
"use strict";

/* ======================================== */
/* TITAN PREMIUM CATALOG ENGINE             */
/* ======================================== */

const $ = id => document.getElementById(id);

let products = [];
let departments = [];
let warehouses = [];

let cart = new Map();
let comparison = new Set();

let account = "guest";
let currentPage = 1;
let toastTimer;

const pageSize = 15;
const storageKey = "titan-premium-demo-v1";

const activeFilters = {
    category: new Set(),
    stock: new Set()
};

const accountTypes = {
    guest: {
        name: "Standard Account",
        discount: 0
    },
    contractor: {
        name: "Contractor Account",
        discount: 0.15
    },
    distributor: {
        name: "Distributor Account",
        discount: 0.25
    }
};


/* ======================================== */
/* UTILITIES                                */
/* ======================================== */

function esc(value) {

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

const currency = value =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);

const roundMoney = value =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const number = value =>
    Number(value).toLocaleString("en-US");

const findProduct = sku =>
    products.find(product => product.sku === sku);

const totalStock = product =>
    Object.values(product.stock)
        .reduce((sum, quantity) => sum + quantity, 0);

function stockStatus(product) {

    const stock = totalStock(product);

    if (stock === 0) return "Out of Stock";
    if (stock < 50) return "Low Stock";

    return "In Stock";

}

function stockClass(product) {

    return stockStatus(product)
        .toLowerCase()
        .replaceAll(" ", "-");

}

function stockLabel(product) {

    return `

        <span class="stock-label ${stockClass(product)}">

            ${esc(stockStatus(product))}
            &bull;
            ${number(totalStock(product))} available

        </span>

    `;

}

function notify(message) {

    clearTimeout(toastTimer);

    $("toast").textContent = message;
    $("toast").hidden = false;

    toastTimer = setTimeout(() => {

        $("toast").hidden = true;

    }, 3000);

}

function scrollToSection(id) {

    $(id).scrollIntoView({
        behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches ? "auto" : "smooth"
    });

}


/* ======================================== */
/* INITIALIZATION                           */
/* ======================================== */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch("./products.json");

        if (!response.ok) {

            throw new Error(
                "Product database could not be loaded."
            );

        }

        const data = await response.json();

        departments = data.departments;
        warehouses = data.warehouses;

        products = generateProducts();

        restoreState();
        bindEvents();
        renderDepartments();
        renderFilters();
        refreshCatalog();
        updateAccount();
        updateCartCount();

    } catch (error) {

        console.error("Titan initialization error:", error);

        $("results-count").textContent =
            "Unable to load the product catalog.";

    }

});


/* ======================================== */
/* PRODUCT GENERATION                       */
/* ======================================== */

function generateProducts() {

    return departments.flatMap((department, d) =>

        department.models.flatMap((model, m) =>

            department.variants.map((variant, v) => {

                const seed = (d + 1) * 107 +
                    (m + 1) * 29 +
                    (v + 1) * 17;

                const sku =

                    `${department.code}-${model.id}-` +
                    String(v + 1).padStart(2, "0");

                const stock = {

                    west: seed * 13 % 240,
                    central: seed * 7 % 160,
                    east: seed * 11 % 190

                };

                if (seed % 13 === 0) {

                    stock.west = 0;
                    stock.central = 0;
                    stock.east = 0;

                } else if (seed % 7 === 0) {

                    stock.west = 12;
                    stock.central = 8;
                    stock.east = 4;

                }

                let multiplier = 1 + v * 0.12;

                if (["TL", "SF"].includes(department.code)) {

                    multiplier = parseInt(variant, 10);

                }

                if (department.code === "WR") {

                    multiplier = parseInt(variant, 10) / 25;

                }

                return {

                    sku,
                    name: model.name,
                    category: department.name,
                    code: department.code,
                    icon: department.icon,

                    specification: department.specification,
                    variant,
                    detail: model.detail,

                    basePrice: roundMoney(
                        model.basePrice * multiplier
                    ),

                    stock,
                    initialStock: {...stock}

                };

            })

        )

    );

}


/* ======================================== */
/* PRICING ENGINE                           */
/* ======================================== */

function accountPrice(product) {

    const discount = accountTypes[account].discount;

    return roundMoney(
        product.basePrice * (1 - discount)
    );

}

function volumeDiscount(quantity) {

    if (quantity >= 100) return 0.10;
    if (quantity >= 50) return 0.05;

    return 0;

}

function unitPrice(product, quantity = 1) {

    const preferredPrice = accountPrice(product);

    return roundMoney(

        preferredPrice *
        (1 - volumeDiscount(quantity))

    );

}

function priceMarkup(product) {

    return `

        <div class="product-price">

            ${account !== "guest"
                ? `<del>${currency(product.basePrice)}</del>`
                : ""}

            ${currency(accountPrice(product))}

            <small>/ catalog item</small>

        </div>

    `;

}


/* ======================================== */
/* PRODUCT ILLUSTRATIONS                    */
/* ======================================== */

function illustration(product) {

    let shape = "";

    switch (product.code) {

        case "CB":

            shape = `
                <rect x="105" y="30" width="110" height="170"
                    rx="5" fill="#DADDE0" stroke="#929BA2"/>
                <rect x="120" y="48" width="80" height="134"
                    rx="3" fill="#F2F3F4"/>
                <rect x="138" y="77" width="44" height="65"
                    rx="4" fill="#263746"/>
                <rect x="143" y="85" width="34" height="22"
                    rx="2" fill="#52616D"/>
                <circle cx="160" cy="45" r="6" fill="#8B9299"/>
                <circle cx="160" cy="185" r="6" fill="#8B9299"/>
            `;

            break;

        case "SW":

            shape = `
                <rect x="98" y="25" width="124" height="180"
                    rx="8" fill="#FAFAFA" stroke="#C2C7CC"/>
                <rect x="120" y="48" width="80" height="134"
                    rx="25" fill="#E2E6E8"/>
                <g fill="#29343C">
                    <rect x="137" y="65" width="8" height="22" rx="2"/>
                    <rect x="175" y="65" width="8" height="22" rx="2"/>
                    <circle cx="160" cy="105" r="7"/>
                    <rect x="137" y="124" width="8" height="22" rx="2"/>
                    <rect x="175" y="124" width="8" height="22" rx="2"/>
                    <circle cx="160" cy="162" r="7"/>
                </g>
            `;

            break;

        case "WR":

            shape = `
                <ellipse cx="160" cy="120" rx="105" ry="82"
                    fill="#3A424B"/>
                ${Array.from({length: 9}, (_, i) => `
                    <ellipse cx="160" cy="120"
                        rx="${96 - i * 6}"
                        ry="${73 - i * 5}"
                        fill="none"
                        stroke="#68747C"
                        stroke-width="4"/>
                `).join("")}
                <ellipse cx="160" cy="120" rx="32" ry="25"
                    fill="#D9DDE0"/>
                <path d="M240 165 Q275 190 285 150"
                    fill="none" stroke="#303D46" stroke-width="12"/>
                <path d="M285 150 L291 131"
                    stroke="#B88143" stroke-width="7"/>
            `;

            break;

        case "CF":

            shape = `
                <rect x="45" y="83" width="230" height="64"
                    rx="8" fill="#B6BEC4"/>
                <ellipse cx="275" cy="115" rx="22" ry="32"
                    fill="#87939C"/>
                <ellipse cx="275" cy="115" rx="15" ry="24"
                    fill="#3A454D"/>
                <path d="M55 95 H255"
                    stroke="#F5F6F7" stroke-width="7"/>
            `;

            break;

        case "BX":

            shape = `
                <path d="M65 60 L100 35 H250 L220 60 Z"
                    fill="#AEB9C2"/>
                <path d="M220 60 L250 35 V165 L220 195 Z"
                    fill="#788996"/>
                <rect x="65" y="60" width="155" height="135"
                    fill="#C6CED4" stroke="#8998A3"/>
                <rect x="77" y="72" width="131" height="111"
                    fill="#DCE1E5" stroke="#8998A3"/>
                <circle cx="88" cy="82" r="4" fill="#66737D"/>
                <circle cx="198" cy="172" r="4" fill="#66737D"/>
            `;

            break;

        case "LT":

            shape = `
                <rect x="42" y="65" width="236" height="100"
                    rx="10" fill="#657581"/>
                <rect x="52" y="75" width="216" height="80"
                    rx="5" fill="#F9F1C7"/>
                ${Array.from({length: 6}, (_, i) => `
                    <rect x="${64 + i * 33}" y="87"
                        width="23" height="56" rx="4"
                        fill="#FFFFFF" opacity=".8"/>
                `).join("")}
            `;

            break;

        case "TF":
        case "MC":

            shape = `
                <rect x="83" y="55" width="154" height="120"
                    rx="4" fill="#485967"/>
                <rect x="100" y="70" width="120" height="90"
                    fill="#B9C3CB"/>
                ${Array.from({length: 6}, (_, i) => `
                    <rect x="${105 + i * 19}" y="56"
                        width="13" height="23"
                        fill="#D0A36B"/>
                    <rect x="${105 + i * 19}" y="150"
                        width="13" height="23"
                        fill="#D0A36B"/>
                `).join("")}
                <rect x="130" y="95" width="60" height="40"
                    fill="#34434F"/>
            `;

            break;

        case "TL":

            shape = `
                <path d="M95 175 L157 100 L173 112 L133 200 Z"
                    fill="#D99E13"/>
                <path d="M225 175 L163 100 L147 112 L187 200 Z"
                    fill="#D99E13"/>
                <path d="M138 110 L108 35 L146 50 L160 90 Z"
                    fill="#89969F"/>
                <path d="M182 110 L212 35 L174 50 L160 90 Z"
                    fill="#89969F"/>
                <circle cx="160" cy="110" r="13"
                    fill="#53616B"/>
            `;

            break;

        default:

            shape = `
                <path d="M120 100 V70
                    A40 40 0 0 1 200 70 V100"
                    fill="none"
                    stroke="#8C989F"
                    stroke-width="15"/>
                <rect x="100" y="95" width="120" height="90"
                    rx="8" fill="#C8473E"/>
                <circle cx="160" cy="140" r="12"
                    fill="#263746"/>
            `;

    }

    return `

        <div class="product-image">

            <svg viewBox="0 0 320 230"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Illustrative ${esc(product.category)} graphic">

                <ellipse cx="160" cy="210"
                    rx="105" ry="8"
                    fill="#000" opacity=".07"/>

                ${shape}

            </svg>

        </div>

    `;

}


/* ======================================== */
/* DEPARTMENTS AND FILTERS                  */
/* ======================================== */

function renderDepartments() {

    $("department-grid").innerHTML =
        departments.map(department => `

            <button class="department-card"
                data-department="${esc(department.name)}"
                type="button">

                <span class="department-icon">

                    ${esc(department.icon)}

                </span>

                <strong>${esc(department.name)}</strong>

                <small>50 products &rarr;</small>

            </button>

        `).join("");

}

function renderFilters() {

    $("category-filters").innerHTML =
        departments.map(department => `

            <label class="filter-option">

                <input type="checkbox"
                    data-filter="category"
                    value="${esc(department.name)}">

                ${esc(department.name)}

            </label>

        `).join("");

    $("stock-filters").innerHTML =
        ["In Stock", "Low Stock", "Out of Stock"]
            .map(status => `

                <label class="filter-option">

                    <input type="checkbox"
                        data-filter="stock"
                        value="${status}">

                    ${status}

                </label>

            `).join("");

    const maximum = Math.ceil(

        Math.max(...products.map(
            product => product.basePrice
        )) / 100

    ) * 100;

    $("price-filter").max = maximum;
    $("price-filter").value = maximum;

    $("price-label").textContent = currency(maximum);

}

function filteredProducts() {

    const query = $("product-search")
        .value.trim().toLowerCase();

    const warehouse = $("warehouse-filter").value;
    const maxPrice = Number($("price-filter").value);

    const results = products.filter(product => {

        const searchable = [

            product.sku,
            product.name,
            product.category,
            product.variant,
            product.detail

        ].join(" ").toLowerCase();

        if (!searchable.includes(query)) return false;

        if (
            activeFilters.category.size &&
            !activeFilters.category.has(product.category)
        ) return false;

        if (
            activeFilters.stock.size &&
            !activeFilters.stock.has(stockStatus(product))
        ) return false;

        if (warehouse && !product.stock[warehouse]) {
            return false;
        }

        return accountPrice(product) <= maxPrice;

    });

    switch ($("product-sort").value) {

        case "name":
            results.sort((a, b) =>
                a.name.localeCompare(b.name));
            break;

        case "sku":
            results.sort((a, b) =>
                a.sku.localeCompare(b.sku));
            break;

        case "price-low":
            results.sort((a, b) =>
                accountPrice(a) - accountPrice(b));
            break;

        case "price-high":
            results.sort((a, b) =>
                accountPrice(b) - accountPrice(a));
            break;

        case "stock":
            results.sort((a, b) =>
                totalStock(b) - totalStock(a));
            break;

    }

    return results;

}

function resetFilters() {

    Object.values(activeFilters)
        .forEach(set => set.clear());

    document.querySelectorAll("[data-filter]")
        .forEach(input => input.checked = false);

    $("product-search").value = "";
    $("product-sort").value = "default";
    $("warehouse-filter").value = "";

    $("price-filter").value = $("price-filter").max;

    $("price-label").textContent =
        currency(Number($("price-filter").max));

    currentPage = 1;

    renderProducts();

}


/* ======================================== */
/* PRODUCT CARDS                            */
/* ======================================== */

function renderProducts() {

    const results = filteredProducts();

    const pages = Math.max(
        1,
        Math.ceil(results.length / pageSize)
    );

    currentPage = Math.min(currentPage, pages);

    const start = (currentPage - 1) * pageSize;

    const visible = results.slice(
        start,
        start + pageSize
    );

    $("results-count").textContent = results.length

        ? `Showing ${start + 1}–${start + visible.length} of ${results.length} products`

        : "No products found";

    $("empty-state").hidden = results.length > 0;

    $("product-grid").innerHTML = visible.map(product => `

        <article class="product-card">

            ${illustration(product)}

            <div class="product-info">

                <p class="product-category">
                    ${esc(product.category)}
                </p>

                <p class="product-sku">
                    ${esc(product.sku)}
                </p>

                <h3>${esc(product.name)}</h3>

                <p class="product-spec">

                    ${esc(product.variant)}
                    &bull;
                    ${esc(product.detail)}

                </p>

                ${stockLabel(product)}

                ${priceMarkup(product)}

                <div class="product-actions">

                    <button class="button secondary"
                        data-details="${product.sku}"
                        type="button">

                        Specifications & Availability

                    </button>

                    <button class="button primary"
                        data-add="${product.sku}"
                        type="button"
                        ${totalStock(product) === 0
                            ? "disabled"
                            : ""}>

                        ${cart.has(product.sku)
                            ? "Add Another"
                            : "Add to Order"}

                    </button>

                    <button class="compare-button
                        ${comparison.has(product.sku)
                            ? "selected"
                            : ""}"
                        data-compare="${product.sku}"
                        aria-pressed="${comparison.has(product.sku)}"
                        type="button">

                        ${comparison.has(product.sku)
                            ? "Selected for Compare ✓"
                            : "+ Compare Product"}

                    </button>

                </div>

            </div>

        </article>

    `).join("");

    renderPagination(pages, results.length);

}

function renderPagination(pages, count) {

    if (count === 0 || pages <= 1) {

        $("pagination").innerHTML = "";
        return;

    }

    const shown = new Set([1, pages]);

    for (
        let i = Math.max(1, currentPage - 2);
        i <= Math.min(pages, currentPage + 2);
        i++
    ) {

        shown.add(i);

    }

    const pageNumbers = [...shown].sort((a, b) => a - b);

    let markup = `

        <button data-page="${currentPage - 1}"
            type="button"
            ${currentPage === 1 ? "disabled" : ""}>
            Previous
        </button>

    `;

    let previous = 0;

    pageNumbers.forEach(page => {

        if (previous && page - previous > 1) {

            markup += `<span>...</span>`;

        }

        markup += `

            <button data-page="${page}"
                type="button"
                ${page === currentPage
                    ? 'aria-current="page"'
                    : ""}>

                ${page}

            </button>

        `;

        previous = page;

    });

    markup += `

        <button data-page="${currentPage + 1}"
            type="button"
            ${currentPage === pages ? "disabled" : ""}>
            Next
        </button>

    `;

    $("pagination").innerHTML = markup;

}


/* ======================================== */
/* PRODUCT SPECIFICATIONS                   */
/* ======================================== */

function specifications(product) {

    return [

        ["SKU", product.sku],
        ["Department", product.category],
        ["Configuration", product.variant],
        ["Specification", product.detail],
        ["Standard Price", currency(product.basePrice)],
        ["Account Price", currency(accountPrice(product))],
        ["Total Availability", number(totalStock(product))],
        ["West Coast", number(product.stock.west)],
        ["Central", number(product.stock.central)],
        ["East Coast", number(product.stock.east)]

    ];

}

function openProduct(sku) {

    const product = findProduct(sku);

    if (!product) return;

    $("product-details").innerHTML = `

        <div class="modal-product-layout">

            ${illustration(product)}

            <div>

                <p class="product-sku">${esc(sku)}</p>

                <h2>${esc(product.name)}</h2>

                ${stockLabel(product)}
                ${priceMarkup(product)}

                <table class="spec-table">

                    <tbody>

                        ${specifications(product)
                            .map(([label, value]) => `

                                <tr>

                                    <th scope="row">${esc(label)}</th>

                                    <td>${esc(value)}</td>

                                </tr>

                            `).join("")}

                    </tbody>

                </table>

                <p class="demo-note">

                    Volume discounts:
                    50+ items receive 5% off,
                    100+ items receive 10% off
                    the applicable account price.

                </p>

                <div class="modal-actions">

                    <button class="button primary"
                        data-add="${sku}"
                        type="button"
                        ${totalStock(product) === 0
                            ? "disabled"
                            : ""}>

                        Add to Order

                    </button>

                    <button class="button secondary"
                        data-spec="${sku}"
                        type="button">

                        Download Specification Sheet

                    </button>

                    <button class="compare-button"
                        data-compare="${sku}"
                        type="button"
                        aria-pressed="${comparison.has(sku)}">

                        ${comparison.has(sku)
                            ? "Selected for Compare ✓"
                            : "+ Compare Product"}

                    </button>

                </div>

            </div>

        </div>

    `;

    $("product-modal").showModal();

}


/* ======================================== */
/* ACCOUNT PORTAL                           */
/* ======================================== */

function updateAccount() {

    const info = accountTypes[account];

    $("account-status").textContent =

        `${info.name} | ` +

        (info.discount

            ? `${Math.round(info.discount * 100)}% Preferred Pricing`

            : "Standard Pricing");

    document.querySelectorAll("[data-account]")
        .forEach(button => {

            const active =
                button.dataset.account === account;

            button.classList.toggle("active", active);

            button.setAttribute(
                "aria-pressed", String(active)
            );

        });

}

function switchAccount(type) {

    if (!Object.hasOwn(accountTypes, type)) return;

    account = type;

    saveState();
    updateAccount();

    currentPage = 1;

    renderProducts();

    $("account-modal").close();

    notify(`Switched to ${accountTypes[type].name}.`);

}


/* ======================================== */
/* PERSISTENT CART                          */
/* ======================================== */

function saveState() {

    try {

        localStorage.setItem(

            storageKey,

            JSON.stringify({

                account,
                cart: [...cart.entries()]

            })

        );

    } catch (error) {

        console.warn("Local storage unavailable.", error);

    }

}

function restoreState() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(storageKey) || "{}"
        );

        if (Object.hasOwn(accountTypes, saved.account)) {

            account = saved.account;

        }

        if (Array.isArray(saved.cart)) {

            saved.cart.forEach(entry => {

                if (!Array.isArray(entry)) return;

                const [sku, quantity] = entry;

                const product = findProduct(sku);

                if (
                    product &&
                    Number.isSafeInteger(quantity) &&
                    quantity > 0
                ) {

                    const validQuantity = Math.min(
                        quantity,
                        totalStock(product)
                    );

                    if (validQuantity > 0) {

                        cart.set(sku, validQuantity);

                    }

                }

            });

        }

    } catch (error) {

        cart = new Map();
        account = "guest";

    }

}

function addToCart(sku, quantity = 1) {

    const product = findProduct(sku);

    if (
        !product ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
    ) return false;

    const requested = (cart.get(sku) || 0) + quantity;

    if (requested > totalStock(product)) {

        notify("Requested quantity exceeds available stock.");

        return false;

    }

    cart.set(sku, requested);

    saveState();
    updateCartCount();
    renderProducts();

    return true;

}

function updateCartCount() {

    $("cart-count").textContent = number(

        [...cart.values()]
            .reduce((sum, quantity) => sum + quantity, 0)

    );

}

function calculateTotals() {

    let standardTotal = 0;
    let preferredTotal = 0;
    let total = 0;

    for (const [sku, quantity] of cart) {

        const product = findProduct(sku);

        if (!product) continue;

        standardTotal += product.basePrice * quantity;

        preferredTotal += accountPrice(product) * quantity;

        total += unitPrice(product, quantity) * quantity;

    }

    return {

        standardTotal: roundMoney(standardTotal),

        accountSavings: roundMoney(
            standardTotal - preferredTotal
        ),

        volumeSavings: roundMoney(
            preferredTotal - total
        ),

        total: roundMoney(total)

    };

}

function renderCart() {

    $("cart-account").textContent =
        accountTypes[account].name;

    $("order-confirmation").hidden = true;

    const entries = [...cart.entries()];

    $("order-form").hidden = !entries.length;

    if (!entries.length) {

        $("cart-items").innerHTML =

            "<p>Your order cart is empty.</p>";

        $("cart-summary").innerHTML = "";

        return;

    }

    $("cart-items").innerHTML = `

        <div class="table-scroll">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Product / SKU</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Discount</th>
                        <th>Subtotal</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    ${entries.map(([sku, quantity]) => {

                        const product = findProduct(sku);

                        return `

                            <tr>

                                <td>

                                    <strong>${esc(product.name)}</strong>

                                    <p class="product-sku">${esc(sku)}</p>

                                    ${esc(product.variant)}

                                </td>

                                <td>

                                    <input type="number"
                                        min="1"
                                        max="${totalStock(product)}"
                                        value="${quantity}"
                                        data-quantity="${sku}"
                                        aria-label="Quantity for ${sku}">

                                </td>

                                <td>

                                    ${currency(unitPrice(product, quantity))}

                                </td>

                                <td>

                                    ${Math.round(volumeDiscount(quantity) * 100)}%

                                </td>

                                <td>

                                    ${currency(unitPrice(product, quantity) * quantity)}

                                </td>

                                <td>

                                    <button class="text-button"
                                        data-remove="${sku}"
                                        type="button">

                                        Remove

                                    </button>

                                </td>

                            </tr>

                        `;

                    }).join("")}

                </tbody>

            </table>

        </div>

    `;

    const totals = calculateTotals();

    $("cart-summary").innerHTML = `

        <div class="cart-summary">

            <div>

                <span>Standard Subtotal</span>

                <strong>${currency(totals.standardTotal)}</strong>

            </div>

            <div>

                <span>Account Savings</span>

                <strong>-${currency(totals.accountSavings)}</strong>

            </div>

            <div>

                <span>Volume Savings</span>

                <strong>-${currency(totals.volumeSavings)}</strong>

            </div>

            <div class="cart-total">

                <span>Estimated Total</span>

                <strong>${currency(totals.total)}</strong>

            </div>

            <p class="demo-note">

                Taxes and shipping are excluded.

            </p>

        </div>

    `;

}


/* ======================================== */
/* BULK ORDERING                            */
/* ======================================== */

function importBulkOrder(event) {

    event.preventDefault();

    const lines = $("bulk-input").value
        .trim()
        .split(/\r?\n/);

    const accepted = [];
    const rejected = [];

    const requested = new Map();

    lines.forEach((line, index) => {

        const cleanLine = line.trim();

        if (!cleanLine) return;

        const fields = cleanLine.split(",")
            .map(value => value.trim().replace(/^"|"$/g, ""));

        if (
            fields[0]?.toLowerCase() === "sku" &&
            fields[1]?.toLowerCase() === "quantity"
        ) return;

        if (fields.length !== 2) {

            rejected.push(`Line ${index + 1}: invalid format.`);

            return;

        }

        const sku = fields[0].toUpperCase();
        const quantity = Number(fields[1]);

        if (
            !findProduct(sku) ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1
        ) {

            rejected.push(
                `${sku}: invalid SKU or quantity.`
            );

            return;

        }

        requested.set(

            sku,

            (requested.get(sku) || 0) + quantity

        );

    });

    for (const [sku, quantity] of requested) {

        const product = findProduct(sku);

        const existing = cart.get(sku) || 0;

        if (existing + quantity > totalStock(product)) {

            rejected.push(

                `${sku}: insufficient available inventory.`

            );

            continue;

        }

        cart.set(sku, existing + quantity);

        accepted.push(`${sku}: ${quantity} added.`);

    }

    saveState();
    updateCartCount();
    renderProducts();

    $("bulk-result").innerHTML = `

        <h3>Bulk Order Results</h3>

        <p>${accepted.length} product lines accepted.</p>

        <ul>

            ${accepted.map(item =>
                `<li>${esc(item)}</li>`
            ).join("")}

        </ul>

        <p>${rejected.length} product lines rejected.</p>

        <ul>

            ${rejected.map(item =>
                `<li>${esc(item)}</li>`
            ).join("")}

        </ul>

        ${accepted.length

            ? `<button class="button primary"
                data-dialog="cart-modal"
                type="button">

                Review Order Cart

            </button>`

            : ""}

    `;

    $("bulk-result").hidden = false;

}


/* ======================================== */
/* DOWNLOAD UTILITIES                       */
/* ======================================== */

function downloadFile(filename, content, type) {

    const blob = new Blob([content], {type});

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

}

function csvCell(value) {

    let text = String(value ?? "");

    if (/^[=+\-@\t\r]/.test(text)) {

        text = "'" + text;

    }

    return `"${text.replaceAll('"', '""')}"`;

}

function downloadCSV(filename, rows) {

    const csv = rows.map(row =>

        row.map(csvCell).join(",")

    ).join("\r\n");

    downloadFile(
        filename,
        csv,
        "text/csv;charset=utf-8"
    );

}

function downloadSpecification(sku) {

    const product = findProduct(sku);

    if (!product) return;

    const content = [

        "TITAN ELECTRICAL SUPPLY",
        "TECHNICAL PRODUCT SPECIFICATION",
        "",
        product.name,
        "",

        ...specifications(product).map(

            ([label, value]) => `${label}: ${value}`

        ),

        "",
        "DEMONSTRATION ONLY",
        "Fictional product specifications.",
        "Not suitable for engineering or installation.",
        "Designed by GJP Web Design & Development"

    ].join("\n");

    downloadFile(

        `${sku}-specification.txt`,

        content,

        "text/plain;charset=utf-8"

    );

}

function exportQuote() {

    if (!cart.size) return;

    const rows = [

        ["Titan Electrical Supply - DEMO QUOTE"],

        ["Account", accountTypes[account].name],

        [
            "SKU",
            "Product",
            "Configuration",
            "Quantity",
            "Unit Price",
            "Subtotal"
        ]

    ];

    for (const [sku, quantity] of cart) {

        const product = findProduct(sku);

        const price = unitPrice(product, quantity);

        rows.push([

            sku,
            product.name,
            product.variant,
            quantity,
            price.toFixed(2),
            (price * quantity).toFixed(2)

        ]);

    }

    rows.push([
        "Estimated Total",
        calculateTotals().total.toFixed(2)
    ]);

    rows.push(["Illustrative quotation only."]);

    downloadCSV("titan-demo-quote.csv", rows);

}

function exportInventory() {

    const rows = [[

        "SKU",
        "Product",
        "Department",
        "West Coast",
        "Central",
        "East Coast",
        "Total Stock"

    ]];

    products.forEach(product => {

        rows.push([

            product.sku,
            product.name,
            product.category,
            product.stock.west,
            product.stock.central,
            product.stock.east,
            totalStock(product)

        ]);

    });

    downloadCSV("titan-demo-inventory.csv", rows);

}


/* ======================================== */
/* COMPARISON                               */
/* ======================================== */

function toggleComparison(sku) {

    if (comparison.has(sku)) {

        comparison.delete(sku);

    } else {

        if (comparison.size >= 3) {

            notify("Compare up to three products.");

            return;

        }

        comparison.add(sku);

    }

    updateComparison();
    renderProducts();

}

function updateComparison() {

    $("compare-bar").hidden = !comparison.size;

    $("compare-count").textContent =

        `${comparison.size} of 3 products selected`;

    $("open-compare").disabled = comparison.size < 2;

    document.body.classList.toggle(

        "has-comparison",

        comparison.size > 0

    );

    $("product-details")
        .querySelectorAll("[data-compare]")
        .forEach(button => {

            const selected =
                comparison.has(button.dataset.compare);

            button.setAttribute("aria-pressed", String(selected));

            button.textContent = selected

                ? "Selected for Compare ✓"

                : "+ Compare Product";

        });

}

function openComparison() {

    const selected = [...comparison]
        .map(findProduct)
        .filter(Boolean);

    if (selected.length < 2) return;

    const labels = specifications(selected[0])
        .map(row => row[0]);

    $("compare-content").innerHTML = `

        <div class="table-scroll">

            <table class="data-table">

                <thead>

                    <tr>

                        <th>Specification</th>

                        ${selected.map(product => `

                            <th>${esc(product.name)}</th>

                        `).join("")}

                    </tr>

                </thead>

                <tbody>

                    ${labels.map((label, index) => `

                        <tr>

                            <th scope="row">${esc(label)}</th>

                            ${selected.map(product => `

                                <td>

                                    ${esc(specifications(product)[index][1])}

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
/* WAREHOUSE MANAGEMENT                     */
/* ======================================== */

function renderWarehouses() {

    $("warehouse-grid").innerHTML =

        warehouses.map(warehouse => {

            const total = products.reduce(

                (sum, product) =>
                    sum + product.stock[warehouse.id],

                0

            );

            const available = products.filter(

                product => product.stock[warehouse.id] > 0

            ).length;

            return `

                <article class="warehouse-card">

                    <p>${esc(warehouse.code)}</p>

                    <h3>${esc(warehouse.name)}</h3>

                    <p>${esc(warehouse.location)}</p>

                    <strong>${number(total)}</strong>

                    <p>Sample units available</p>

                    <p>${available} active product SKUs</p>

                </article>

            `;

        }).join("");

    $("metric-products").textContent = products.length;

    $("metric-stock").textContent = products.filter(

        product => totalStock(product) > 0

    ).length;

}

function renderInventory() {

    const search = $("inventory-search")
        .value.trim().toLowerCase();

    const matches = products.filter(product =>

        `${product.name} ${product.sku} ${product.variant}`

            .toLowerCase()

            .includes(search)

    );

    const visible = matches.slice(0, 50);

    $("inventory-table").innerHTML = `

        <p class="demo-note">

            Showing ${visible.length} of ${matches.length}
            matching records. Search by SKU to locate
            any individual product.

        </p>

        <div class="table-scroll">

            <table class="data-table">

                <thead>

                    <tr>

                        <th>SKU</th>
                        <th>Product</th>
                        <th>West</th>
                        <th>Central</th>
                        <th>East</th>
                        <th>Total</th>

                    </tr>

                </thead>

                <tbody>

                    ${visible.map(product => `

                        <tr>

                            <td>${esc(product.sku)}</td>

                            <td>

                                ${esc(product.name)}

                                <p class="product-sku">

                                    ${esc(product.variant)}

                                </p>

                            </td>

                            ${warehouses.map(warehouse => `

                                <td>

                                    <input type="number"
                                        min="0"
                                        max="100000"
                                        value="${product.stock[warehouse.id]}"
                                        data-inventory="${product.sku}"
                                        data-location="${warehouse.id}"
                                        aria-label="${product.sku} ${warehouse.name} stock">

                                </td>

                            `).join("")}

                            <td>${number(totalStock(product))}</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}

function reconcileCart() {

    for (const [sku, quantity] of cart) {

        const product = findProduct(sku);

        const available = totalStock(product);

        if (available === 0) {

            cart.delete(sku);

        } else if (quantity > available) {

            cart.set(sku, available);

        }

    }

    saveState();
    updateCartCount();

}

function refreshCatalog() {

    renderProducts();
    renderWarehouses();

}


/* ======================================== */
/* ORDER PREVIEW                            */
/* ======================================== */

function previewOrder(event) {

    event.preventDefault();

    if (!cart.size) return;

    const total = calculateTotals().total;

    $("order-confirmation").innerHTML = `

        <h3>Commercial Order Preview</h3>

        <p>

            Prepared for
            ${esc($("customer-name").value)}
            at
            ${esc($("customer-company").value)}.

        </p>

        <p>

            Account:
            ${esc(accountTypes[account].name)}

        </p>

        <p>

            Purchase Order:
            ${esc($("purchase-order").value || "Not provided")}

        </p>

        <p>

            Product Lines: ${cart.size}

        </p>

        <p>

            <strong>

                Estimated Order Total:
                ${currency(total)}

            </strong>

        </p>

        <p>

            This is a simulated order preview.
            No order has been placed, no payment
            has been collected and no information
            has been transmitted.

        </p>

    `;

    $("order-confirmation").hidden = false;

    $("order-confirmation").scrollIntoView({

        behavior: "auto",

        block: "nearest"

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

    $("warehouse-filter").addEventListener("change", () => {

        currentPage = 1;
        renderProducts();

    });

    $("price-filter").addEventListener("input", () => {

        $("price-label").textContent = currency(

            Number($("price-filter").value)

        );

        currentPage = 1;
        renderProducts();

    });

    $("reset-filters").addEventListener("click", resetFilters);

    $("empty-reset").addEventListener("click", resetFilters);

    $("open-account").addEventListener("click", () => {

        $("account-modal").showModal();

    });

    $("open-cart").addEventListener("click", () => {

        renderCart();

        $("cart-modal").showModal();

    });

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

        comparison.clear();

        updateComparison();
        renderProducts();

    });

    $("open-compare").addEventListener(
        "click", openComparison
    );

    $("bulk-form").addEventListener(
        "submit", importBulkOrder
    );

    $("order-form").addEventListener(
        "submit", previewOrder
    );

    $("order-form").addEventListener("input", () => {

        $("order-confirmation").hidden = true;

    });

    $("export-quote").addEventListener(
        "click", exportQuote
    );

    $("export-inventory").addEventListener(
        "click", exportInventory
    );

    $("download-template").addEventListener("click", () => {

        downloadCSV("titan-bulk-order-template.csv", [

            ["SKU", "Quantity"],

            ["CB-101-01", 10],

            ["SW-101-01", 25],

            ["WR-101-01", 5]

        ]);

    });

    $("csv-upload").addEventListener("change", async event => {

        const file = event.target.files[0];

        if (!file) return;

        if (file.size > 1000000) {

            notify("Please use a CSV smaller than 1 MB.");

            return;

        }

        try {

            $("bulk-input").value = await file.text();

        } catch {

            notify("Unable to read the selected CSV.");

        }

    });

    $("open-inventory").addEventListener("click", () => {

        $("inventory-search").value = "";

        renderInventory();

        $("inventory-modal").showModal();

    });

    $("inventory-search").addEventListener(
        "input", renderInventory
    );

    $("reset-inventory").addEventListener("click", () => {

        products.forEach(product => {

            product.stock = {...product.initialStock};

        });

        reconcileCart();

        refreshCatalog();
        renderInventory();

        notify("Sample inventory restored.");

    });


    /* DYNAMIC CHANGE EVENTS */

    document.addEventListener("change", event => {

        const input = event.target;

        if (input.matches("[data-filter]")) {

            const group = activeFilters[input.dataset.filter];

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

            const product = findProduct(sku);

            if (!product) return;

            const quantity = Math.min(

                totalStock(product),

                Math.max(
                    1,
                    Math.floor(Number(input.value) || 1)
                )

            );

            if (quantity === 0) {

                cart.delete(sku);

            } else {

                cart.set(sku, quantity);

            }

            saveState();
            updateCartCount();
            renderCart();

        }


        if (input.matches("[data-inventory]")) {

            const product = findProduct(
                input.dataset.inventory
            );

            if (!product) return;

            const location = input.dataset.location;

            if (!Object.hasOwn(product.stock, location)) {
                return;
            }

            product.stock[location] = Math.min(

                100000,

                Math.max(
                    0,
                    Math.floor(Number(input.value) || 0)
                )

            );

            reconcileCart();

            refreshCatalog();
            renderInventory();

        }

    });


    /* DYNAMIC CLICK EVENTS */

    document.addEventListener("click", event => {

        const button = event.target.closest("button");

        if (!button || button.disabled) return;

        const data = button.dataset;

        if (data.close) {

            $(data.close).close();

        }

        if (data.dialog) {

            if (data.dialog === "cart-modal") {

                renderCart();

            }

            $(data.dialog).showModal();

        }

        if (data.details) {

            openProduct(data.details);

        }

        if (data.account) {

            switchAccount(data.account);

        }

        if (data.add) {

            if (addToCart(data.add)) {

                notify("Product added to order cart.");

            }

        }

        if (data.remove) {

            cart.delete(data.remove);

            saveState();

            updateCartCount();
            renderCart();
            renderProducts();

        }

        if (data.compare) {

            toggleComparison(data.compare);

        }

        if (data.spec) {

            downloadSpecification(data.spec);

        }

        if (data.page) {

            currentPage = Number(data.page);

            renderProducts();

            scrollToSection("catalog");

        }

        if (data.department) {

            resetFilters();

            activeFilters.category.add(data.department);

            document.querySelectorAll(

                '[data-filter="category"]'

            ).forEach(input => {

                input.checked =
                    input.value === data.department;

            });

            currentPage = 1;

            renderProducts();

            scrollToSection("catalog");

        }

    });

}
