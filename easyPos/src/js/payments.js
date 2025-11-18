// This file contains functions related to payment processing. 
// It handles the logic for finalizing transactions, applying discounts, and managing payment methods.

const TAX_RATE = 0.08; 
const CURRENCY_SYMBOL = 'R'; 

let currentItems = [];
let discountType = 'none'; // 'none', 'percentage', or 'amount'
let discountValue = 0; // Value of the discount (e.g., 10 for %, or 5.00 for R)

function finalizeTransaction(method) {
    const total = parseFloat(document.getElementById('grand-total').textContent.replace(CURRENCY_SYMBOL, ''));
    const transactionId = document.getElementById('transaction-id-info').textContent;

    console.log(`--- TRANSACTION FINALIZED ---`);
    console.log(`ID: ${transactionId}`);
    console.log(`Method: ${method}`);
    console.log(`Total Paid: ${CURRENCY_SYMBOL}${total.toFixed(2)}`);

    currentItems = [];
    discountType = 'none';
    discountValue = 0;
    updateTransaction(); // Resets to default action view and hides overlay
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

function applyDiscountFromInput(type) {
    const input = document.getElementById('discount-input-field');
    const value = parseFloat(input.value);

    if (isNaN(value) || value < 0) {
        console.log("Invalid discount value entered.");
        return;
    }

    if (type === 'percentage' && value > 100) {
        console.log("Percentage cannot exceed 100.");
        return;
    }

    discountType = type;
    discountValue = value;

    updateTransaction();
}

// Additional functions related to payment processing can be added here.