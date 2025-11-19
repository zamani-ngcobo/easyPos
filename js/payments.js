(function () {
  // Prevent double-loading
  if (window.__EASYPOS_PAYMENTS_LOADED) return;
  window.__EASYPOS_PAYMENTS_LOADED = true;

  // Put module state inside a single object on window to avoid global name collisions
  const NS = (window.__EASYPOS_PAYMENTS = window.__EASYPOS_PAYMENTS || {});

  NS.TAX_RATE = NS.TAX_RATE ?? 0.08;
  NS.CURRENCY_SYMBOL = NS.CURRENCY_SYMBOL ?? "R";

  NS.currentItems = NS.currentItems ?? [];
  NS.discountType = NS.discountType ?? "none"; // 'none' | 'percentage' | 'amount'
  NS.discountValue = NS.discountValue ?? 0;

  function formatCurrency(v) {
    return (NS.CURRENCY_SYMBOL || "R") + Number(v || 0).toFixed(2);
  }

  function computeSubtotalFromDOM() {
    const nodes = document.querySelectorAll(".item-list-view [data-price]");
    let sum = 0;
    nodes.forEach((n) => {
      const p = parseFloat(n.getAttribute("data-price"));
      if (!isNaN(p)) sum += p;
    });
    return sum;
  }

  function updateTransaction() {
    const subtotal =
      (NS.currentItems && NS.currentItems.length
        ? NS.currentItems.reduce((acc, it) => acc + Number(it.price || 0), 0)
        : 0) || computeSubtotalFromDOM();

    let discountAmt = 0;
    if (NS.discountType === "amount") {
      discountAmt = Math.min(NS.discountValue, subtotal);
    } else if (NS.discountType === "percentage") {
      discountAmt = subtotal * (NS.discountValue / 100);
    }
    const taxable = Math.max(0, subtotal - discountAmt);
    const tax = taxable * NS.TAX_RATE;
    const grand = Math.max(0, taxable + tax);

    const elSubtotal = document.getElementById("subtotal");
    const elDiscount = document.getElementById("discount-value");
    const elTax = document.getElementById("tax");
    const elGrand = document.getElementById("grand-total");

    if (elSubtotal) elSubtotal.textContent = formatCurrency(subtotal);
    if (elDiscount) elDiscount.textContent = formatCurrency(discountAmt);
    if (elTax) elTax.textContent = formatCurrency(tax);
    if (elGrand) elGrand.textContent = formatCurrency(grand);
  }

  function applyFixedDiscount(amount) {
    const n = Number(amount);
    if (isNaN(n) || n <= 0) return false;
    NS.discountType = "amount";
    NS.discountValue = n;
    updateTransaction();
    return true;
  }

  function finalizeTransaction(method) {
    const elGrand = document.getElementById("grand-total");
    const totalText = elGrand
      ? elGrand.textContent.replace(NS.CURRENCY_SYMBOL, "")
      : "0";
    console.log("--- TRANSACTION FINALIZED ---");
    console.log("Method:", method);
    console.log(
      "Total:",
      NS.CURRENCY_SYMBOL + Number(totalText || 0).toFixed(2)
    );

    // reset state
    NS.currentItems = [];
    NS.discountType = "none";
    NS.discountValue = 0;
    updateTransaction();

    // hide overlay if open
    const paymentOverlay = document.getElementById("payment-overlay");
    if (paymentOverlay) {
      paymentOverlay.classList.add("hidden");
      paymentOverlay.setAttribute("aria-hidden", "true");
    }

    // re-enable discount button (if present)
    const btnPayDiscount = document.getElementById("btn-pay-discount");
    if (btnPayDiscount) btnPayDiscount.disabled = false;
  }

  // Expose a minimal API for other scripts (safe to overwrite)
  window.easyPosPayments = {
    updateTransaction,
    applyFixedDiscount,
    finalizeTransaction,
    __ns: NS,
  };

  // Wiring: attach handlers after DOM ready, but be defensive (don't throw if elements missing)
  document.addEventListener("DOMContentLoaded", () => {
    updateTransaction();

    const btnOpenPayment = document.getElementById("btn-open-payment");
    const paymentOverlay = document.getElementById("payment-overlay");
    const btnCancelPayment = document.getElementById("btn-cancel-payment");

    const btnPayCash = document.getElementById("btn-overlay-cash");
    const btnPayCard = document.getElementById("btn-overlay-card");
    const btnPayVoucher = document.getElementById("btn-overlay-voucher");
    const btnPayDiscount = document.getElementById("btn-pay-discount"); // ensure defined here

    const amountModalContainer = document.getElementById(
      "payment-amount-modal"
    );
    const amountDisplay = document.getElementById("amount-display");
    const amountMethodLabel = document.getElementById("amount-method");

    // discount inputs inside discount modal
    const discountInputAmount = document.getElementById(
      "discount-amount-input"
    );
    const discountInputPercent = document.getElementById(
      "discount-percent-input"
    );
    const discountInputAmountWrapper = document.getElementById(
      "discount-input-amount"
    );
    const discountInputPercentWrapper = document.getElementById(
      "discount-input-percent"
    );
    const discountTypeAmount = document.getElementById("discount-type-amount");
    const discountTypePercent = document.getElementById(
      "discount-type-percent"
    );

    // Numeric keypad state
    let amtBuffer = "0";
    let currentPaymentMethod = null;
    let currentAmountTarget = null; // id of an input to populate (e.g. 'discount-amount-input')

    function formatAmtForDisplay(buf) {
      if (!buf || buf === "") return "R0.00";
      const n = Number(buf);
      if (isNaN(n)) return "R0.00";
      return "R" + n.toFixed(2);
    }

    function renderAmount() {
      if (amountDisplay)
        amountDisplay.textContent = formatAmtForDisplay(amtBuffer);
      // update live target input if present (unformatted raw numeric string)
      if (currentAmountTarget) {
        const el = document.getElementById(currentAmountTarget);
        if (el) {
          // set raw numeric value (allow decimal)
          el.value = amtBuffer;
        }
      }
    }

    function openAmountModalFor(method, targetInputId = null) {
      currentPaymentMethod = method;
      currentAmountTarget = targetInputId || null;
      // initialize buffer from target input if present
      if (currentAmountTarget) {
        const tgt = document.getElementById(currentAmountTarget);
        amtBuffer = tgt && tgt.value ? String(tgt.value) : "0";
      } else {
        amtBuffer = "0";
      }
      renderAmount();
      if (amountMethodLabel) amountMethodLabel.textContent = method;
      if (amountModalContainer) {
        amountModalContainer.classList.remove("hidden");
        amountModalContainer.setAttribute("aria-hidden", "false");
        const bd = amountModalContainer.querySelector(".amount-modal-backdrop");
        if (bd) bd.style.background = "rgba(0,0,0,0.75)";
      }
      document.addEventListener("keydown", onAmountEsc);
    }

    function closeAmountModal() {
      if (amountModalContainer) {
        amountModalContainer.classList.add("hidden");
        amountModalContainer.setAttribute("aria-hidden", "true");
      }
      document.removeEventListener("keydown", onAmountEsc);
      currentPaymentMethod = null;
      currentAmountTarget = null;
      amtBuffer = "0";
    }
    function onAmountEsc(e) {
      if (e.key === "Escape") closeAmountModal();
    }

    function amountKeyPress(key) {
      if (key === "C") {
        amtBuffer = "0";
      } else if (key === "←") {
        if (amtBuffer.length <= 1) amtBuffer = "0";
        else amtBuffer = amtBuffer.slice(0, -1);
      } else if (key === ".") {
        if (!amtBuffer.includes(".")) amtBuffer += ".";
      } else {
        if (amtBuffer === "0") amtBuffer = key;
        else amtBuffer += key;
      }
      renderAmount();
    }

    function confirmAmount() {
      const entered = Number(amtBuffer || 0);
      // If keypad was opened to populate a discount input, apply discount
      if (currentAmountTarget === "discount-amount-input") {
        // apply as fixed amount discount via exposed API
        if (
          entered > 0 &&
          window.easyPosPayments &&
          typeof window.easyPosPayments.applyFixedDiscount === "function"
        ) {
          window.easyPosPayments.applyFixedDiscount(entered);
        }
        // ensure discount modal UI closes (if visible)
        const discountContainer = document.getElementById(
          "discount-modal-container"
        );
        if (discountContainer) {
          discountContainer.classList.add("hidden");
          discountContainer.setAttribute("aria-hidden", "true");
        }
        closeAmountModal();
        return;
      }
      // Otherwise treat as tender entry for payment
      console.log("Tender entered:", currentPaymentMethod, entered);
      if (typeof window.easyPosPayments?.finalizeTransaction === "function") {
        window.easyPosPayments.finalizeTransaction(
          currentPaymentMethod || "Unknown"
        );
      } else if (typeof finalizeTransaction === "function") {
        finalizeTransaction(currentPaymentMethod || "Unknown");
      }
      closeAmountModal();
    }

    // attach keypad buttons if modal exists
    if (amountModalContainer) {
      amountModalContainer.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-key]");
        if (!btn) return;
        const k = btn.getAttribute("data-key");
        if (!k) return;
        if (k === "OK") {
          confirmAmount();
        } else if (k === "CANCEL") {
          closeAmountModal();
        } else amountKeyPress(k);
      });
    }

    // guarded handlers for payments
    if (btnPayCash)
      btnPayCash.addEventListener("click", () => openAmountModalFor("Cash"));
    if (btnPayCard)
      btnPayCard.addEventListener("click", () => openAmountModalFor("Card"));
    if (btnPayVoucher)
      btnPayVoucher.addEventListener("click", () =>
        openAmountModalFor("Voucher")
      );
    if (btnPayDiscount)
      btnPayDiscount.addEventListener("click", () => {
        // open discount modal (existing function) - show discount UI only
        openDiscountModal?.();
      });

    // When discount 'Amount' radio selected, open numeric keypad targeted at discount input
    if (discountTypeAmount) {
      discountTypeAmount.addEventListener("change", () => {
        // show the discount input area inside discount modal (if present)
        if (discountInputAmountWrapper)
          discountInputAmountWrapper.classList.remove("hidden");
        if (discountInputPercentWrapper)
          discountInputPercentWrapper.classList.add("hidden");
        // open keypad targeted to discount input so user taps digits
        openAmountModalFor("Discount - Amount", "discount-amount-input");
      });
    }
    if (discountTypePercent) {
      discountTypePercent.addEventListener("change", () => {
        if (discountInputPercentWrapper)
          discountInputPercentWrapper.classList.remove("hidden");
        if (discountInputAmountWrapper)
          discountInputAmountWrapper.classList.add("hidden");
      });
    }

    // discount modal elements (inside overlay)
    const discountContainer = document.getElementById(
      "discount-modal-container"
    );
    const btnDiscountApply = document.getElementById("btn-discount-apply");
    const btnDiscountCancel = document.getElementById("btn-discount-cancel");
    const discountBackdrop = () =>
      discountContainer?.querySelector(".discount-modal-backdrop");

    function isOverlayOpen() {
      return paymentOverlay && !paymentOverlay.classList.contains("hidden");
    }

    function openPaymentOverlay() {
      if (!paymentOverlay) return;
      // ensure discount modal closed
      closeDiscountModal();
      paymentOverlay.classList.remove("hidden");
      paymentOverlay.setAttribute("aria-hidden", "false");
    }
    function closePaymentOverlay() {
      if (!paymentOverlay) return;
      paymentOverlay.classList.add("hidden");
      paymentOverlay.setAttribute("aria-hidden", "true");
      closeDiscountModal();
    }

    function openDiscountModal() {
      if (!isOverlayOpen()) return;
      if (!discountContainer) return;
      discountContainer.classList.remove("hidden");
      discountContainer.setAttribute("aria-hidden", "false");
      if (discountTypeAmount) discountTypeAmount.checked = false;
      if (discountTypePercent) discountTypePercent.checked = false;
      if (discountInputAmount) discountInputAmount.classList.add("hidden");
      if (discountInputPercent) discountInputPercent.classList.add("hidden");
      if (inputAmount) inputAmount.value = "";
      if (inputPercent) inputPercent.value = "";
      setTimeout(() => {
        document.addEventListener("keydown", onEsc);
        const bd = discountBackdrop();
        bd?.addEventListener("click", closeDiscountModal);
      }, 10);
    }

    function closeDiscountModal() {
      if (!discountContainer) return;
      discountContainer.classList.add("hidden");
      discountContainer.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onEsc);
      const bd = discountBackdrop();
      bd?.removeEventListener("click", closeDiscountModal);
    }

    function onEsc(e) {
      if (e.key === "Escape") closeDiscountModal();
    }

    // Safe event attachments (no throw if null)
    if (btnOpenPayment)
      btnOpenPayment.addEventListener("click", openPaymentOverlay);
    if (btnCancelPayment)
      btnCancelPayment.addEventListener("click", closePaymentOverlay);

    if (btnPayCash)
      btnPayCash.addEventListener("click", () => finalizeTransaction("Cash"));
    if (btnPayCard)
      btnPayCard.addEventListener("click", () => finalizeTransaction("Card"));
    if (btnPayVoucher)
      btnPayVoucher.addEventListener("click", () =>
        finalizeTransaction("Voucher")
      );

    if (btnDiscountApply) {
      btnDiscountApply.addEventListener("click", () => {
        if (discountTypeAmount?.checked) {
          const v = Number(inputAmount?.value || 0);
          if (isNaN(v) || v <= 0) return;
          applyFixedDiscount(v);
        } else if (discountTypePercent?.checked) {
          const v = Number(inputPercent?.value || 0);
          if (isNaN(v) || v <= 0 || v > 100) return;
          NS.discountType = "percentage";
          NS.discountValue = v;
          updateTransaction();
        } else {
          return;
        }
        if (btnPayDiscount) btnPayDiscount.disabled = true;
        closeDiscountModal();
      });
    }

    if (btnDiscountCancel)
      btnDiscountCancel.addEventListener("click", closeDiscountModal);

    // Make finalizeTransaction available globally and ensure it resets UI state
    const originalFinalize =
      window.easyPosPayments?.finalizeTransaction || finalizeTransaction;
    window.easyPosPayments.finalizeTransaction = function (method) {
      originalFinalize(method);
      // ensure discount UI and button state reset
      closeDiscountModal();
      if (document.getElementById("btn-pay-discount")) {
        document.getElementById("btn-pay-discount").disabled = false;
      }
    };

    // Minimal wiring: attach payment overlay buttons to existing handlers in app.js

    document.addEventListener("DOMContentLoaded", () => {
      const btnOverlayCash = document.getElementById("btn-overlay-cash");
      const btnOverlayCard = document.getElementById("btn-overlay-card");
      const btnOverlayVoucher = document.getElementById("btn-overlay-voucher");
      const btnCancelPayment = document.getElementById("btn-cancel-payment");

      if (btnOverlayCash)
        btnOverlayCash.addEventListener("click", () => {
          if (typeof handleCashPayment === "function") handleCashPayment();
        });
      if (btnOverlayCard)
        btnOverlayCard.addEventListener("click", () => {
          if (typeof handleCardPayment === "function") handleCardPayment();
        });
      if (btnOverlayVoucher)
        btnOverlayVoucher.addEventListener("click", () => {
          if (typeof handleVoucherPayment === "function")
            handleVoucherPayment();
        });
      if (btnCancelPayment)
        btnCancelPayment.addEventListener("click", () => {
          const overlay = document.getElementById("payment-overlay");
          if (overlay) {
            overlay.style.display = "none";
            overlay.setAttribute("aria-hidden", "true");
          }
        });
    });
  });
})();
