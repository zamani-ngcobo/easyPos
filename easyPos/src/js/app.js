// This file contains the main JavaScript logic for the application.
// It handles the initialization of the POS system, manages item selection,
// updates the transaction summary, and controls the display of the payment overlay.

const TAX_RATE = 0.08;
const CURRENCY_SYMBOL = "R";

let currentItems = [];
let selectedItemIndices = [];
let discountType = "none";
let discountValue = 0;

function initializeHeader() {
  const datetimeInfo = document.getElementById("datetime-info");
  const transactionIdInfo = document.getElementById("transaction-id-info");
  const cashierInfo = document.getElementById("cashier-info");

  if (cashierInfo) cashierInfo.innerHTML = `Cashier: John Smith`;

  const transId = Math.floor(Math.random() * 89999) + 10000;
  if (transactionIdInfo) transactionIdInfo.innerHTML = `Trans #: ${transId}`;

  function updateDateTime() {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US");
    const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true };
    const formattedTime = now.toLocaleTimeString("en-US", timeOptions);

    if (datetimeInfo)
      datetimeInfo.innerHTML = `Date: ${formattedDate} | Time: ${formattedTime}`;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  showDefaultActions();
}

function showDefaultActions() {
  selectedItemIndices = [];
  updateTransaction();

  const container = document.getElementById("action-buttons-container");
  if (!container) return;

  container.innerHTML = `
        <button class="void-button" id="void-button">VOID SELECTED ITEMS</button>
        <button class="transact-button" id="btn-transact">TRANSACT</button>
    `;

  const voidBtn = document.getElementById("void-button");
  if (voidBtn) voidBtn.addEventListener("click", handleVoidButtonClick);

  const transactBtn = document.getElementById("btn-transact");
  if (transactBtn) transactBtn.addEventListener("click", showPaymentOverlay);

  hidePaymentOverlay();
}

function showPaymentOverlay() {
  const paymentOverlay = document.getElementById("payment-overlay");
  if (!paymentOverlay) return;
  // use inline style 'flex' because item-selection checks for style.display === "flex"
  paymentOverlay.style.display = "flex";
  paymentOverlay.setAttribute("aria-hidden", "false");
}

function hidePaymentOverlay() {
  const overlay = document.getElementById("payment-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
}

function showDiscountInputView(type) {
  const container = document.getElementById("action-buttons-container");
  if (!container) return;

  const placeholder =
    type === "percentage"
      ? "Enter Percentage (e.g., 10)"
      : "Enter Amount (e.g., 5.00)";
  const title =
    type === "percentage"
      ? "Apply Percentage Discount"
      : "Apply Fixed Amount Discount";

  let initialValue = "";
  if (discountType === type) {
    initialValue = discountValue;
  }

  container.innerHTML = `
        <div style="padding: 10px; text-align: center; color: white; background-color: #343a40;">
            <div style="font-weight: bold; margin-bottom: 10px;">${title}</div>
            <input type="number" id="discount-input-field" placeholder="${placeholder}" value="${initialValue}" step="any" autofocus>
            <button id="apply-discount-btn">APPLY</button>
            <button id="cancel-discount-btn">CANCEL / CLEAR DISCOUNT</button>
        </div>
    `;

  document
    .getElementById("apply-discount-btn")
    .addEventListener("click", () => {
      applyDiscountFromInput(type);
    });
  document
    .getElementById("cancel-discount-btn")
    .addEventListener("click", () => {
      if (discountType !== "none") {
        clearDiscount();
      }
      showDefaultActions();
    });

  const inp = document.getElementById("discount-input-field");
  if (inp) inp.focus();
}

function applyDiscountFromInput(type) {
  const input = document.getElementById("discount-input-field");
  if (!input) return;

  const value = parseFloat(input.value);

  if (isNaN(value) || value < 0) {
    console.log("Invalid discount value entered.");
    return;
  }

  if (type === "percentage" && value > 100) {
    console.log("Percentage cannot exceed 100.");
    return;
  }

  discountType = type;
  discountValue = value;

  updateTransaction();
  showDefaultActions();
}

function clearDiscount() {
  discountType = "none";
  discountValue = 0;
  updateTransaction();
}

function handleItemSelect(event) {
  const overlay = document.getElementById("payment-overlay");
  if (overlay && overlay.style.display === "flex") {
    console.log("Item modification disabled during payment process.");
    return;
  }

  const listItem = event.currentTarget;
  const index = parseInt(listItem.dataset.index);

  const existingIndex = selectedItemIndices.indexOf(index);

  if (existingIndex > -1) {
    selectedItemIndices.splice(existingIndex, 1);
  } else {
    selectedItemIndices.push(index);
  }

  updateTransaction();
}

function updateTransaction() {
  const itemList = document.querySelector(".item-list-view");
  const voidButton = document.getElementById("void-button");
  if (itemList) itemList.innerHTML = "";
  let rawSubtotal = 0;

  if (voidButton) {
    if (selectedItemIndices.length > 0) {
      voidButton.classList.add("ready");
    } else {
      voidButton.classList.remove("ready");
    }
  }

  currentItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.dataset.index = index;
    rawSubtotal += item.price;

    if (selectedItemIndices.includes(index)) {
      li.classList.add("selected");
    }

    li.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-price">${CURRENCY_SYMBOL}${item.price.toFixed(
      2
    )}</span>
        `;

    li.addEventListener("click", handleItemSelect);

    if (itemList) itemList.appendChild(li);
  });

  let discountValueCalculated = 0.0;
  let discountedSubtotal = rawSubtotal;

  if (discountType === "percentage" && discountValue > 0) {
    discountValueCalculated = rawSubtotal * (discountValue / 100);
    discountedSubtotal = rawSubtotal - discountValueCalculated;
  } else if (discountType === "amount" && discountValue > 0) {
    discountValueCalculated = discountValue;
    discountedSubtotal = Math.max(0, rawSubtotal - discountValue);
  }

  const taxAmount = discountedSubtotal * TAX_RATE;
  const grandTotal = discountedSubtotal + taxAmount;

  const elSubtotal = document.getElementById("subtotal");
  const elDiscount = document.getElementById("discount-value");
  const elTax = document.getElementById("tax");
  const elGrand = document.getElementById("grand-total");

  if (elSubtotal)
    elSubtotal.textContent = `${CURRENCY_SYMBOL}${rawSubtotal.toFixed(2)}`;

  let discountDisplay = `${CURRENCY_SYMBOL}${-discountValueCalculated.toFixed(
    2
  )}`;
  if (discountType === "percentage" && discountValue > 0) {
    discountDisplay = `${discountDisplay} (${discountValue}%)`;
  } else if (discountType === "amount" && discountValue > 0) {
    discountDisplay = `${discountDisplay} (R${discountValue.toFixed(2)})`;
  }
  if (elDiscount)
    elDiscount.textContent =
      discountValueCalculated > 0 ? discountDisplay : `${CURRENCY_SYMBOL}0.00`;

  if (elTax) elTax.textContent = `${CURRENCY_SYMBOL}${taxAmount.toFixed(2)}`;
  if (elGrand)
    elGrand.textContent = `${CURRENCY_SYMBOL}${grandTotal.toFixed(2)}`;
}

function handleVoidButtonClick() {
  const overlay = document.getElementById("payment-overlay");
  if (overlay && overlay.style.display === "flex") {
    console.log("Item modification disabled during payment process.");
    return;
  }

  if (selectedItemIndices.length === 0) {
    console.log("VOID failed: Please select one or more items to void.");
    return;
  }

  selectedItemIndices.sort((a, b) => b - a);

  selectedItemIndices.forEach((index) => {
    if (index >= 0 && index < currentItems.length) {
      currentItems.splice(index, 1);
    }
  });

  selectedItemIndices = [];
  clearDiscount();
  showDefaultActions();
}

function handleProductClick(event) {
  const overlay = document.getElementById("payment-overlay");
  if (overlay && overlay.style.display === "flex") {
    console.log("Item modification disabled during payment process.");
    return;
  }

  const button = event.target;
  const price = parseFloat(button.dataset.price);
  const name = button.dataset.name;

  if (isNaN(price)) {
    console.error("Invalid price data on product button:", button);
    return;
  }

  selectedItemIndices = [];
  currentItems.push({ name: name, price: price });
  updateTransaction();
}

function finalizeTransaction(method) {
  const elGrand = document.getElementById("grand-total");
  const total = parseFloat(
    elGrand ? elGrand.textContent.replace(CURRENCY_SYMBOL, "") : "0"
  );

  const transactionId =
    document.getElementById("transaction-id-info")?.textContent || "";

  console.log(`--- TRANSACTION FINALIZED ---`);
  console.log(`ID: ${transactionId}`);
  console.log(`Method: ${method}`);
  console.log(
    `Total Paid: ${CURRENCY_SYMBOL}${(isNaN(total) ? 0 : total).toFixed(2)}`
  );

  currentItems = [];
  selectedItemIndices = [];
  clearDiscount();
  showDefaultActions();
}

function handleCashPayment() {
  if (currentItems.length > 0) {
    finalizeTransaction("Cash");
  } else {
    console.log("Cannot finalize transaction: No items in basket.");
  }
}

function handleCardPayment() {
  if (currentItems.length > 0) {
    finalizeTransaction("Card");
  } else {
    console.log("Cannot finalize transaction: No items in basket.");
  }
}

function handleVoucherPayment() {
  if (currentItems.length > 0) {
    finalizeTransaction("Voucher");
  } else {
    console.log("Cannot finalize transaction: No items in basket.");
  }
}

function attachListeners() {
  document.querySelectorAll(".product-item").forEach((button) => {
    button.addEventListener("click", handleProductClick);
  });
}

window.onload = function () {
  currentItems.push({ name: "Latte", price: 4.5 });
  currentItems.push({ name: "Croissant", price: 3.0 });
  currentItems.push({ name: "Iced Coffee", price: 4.75 });

  initializeHeader();
  attachListeners();
  updateTransaction();
};
