const sleep = ms => new Promise(r => setTimeout(r, ms));
var interval_id;

const merchant = "merchant.taler.windfis.ch";
const auth_token = "y9jgHGtLzA6PSyPcId2n";
const currency = "MANA";

const modal_background = document.getElementById("modal");
console.log(modal_background);
const modal_payment = document.getElementById("modal-content-payment");
const modal_success = document.getElementById("modal-content-success");
modal_success.onclick = close_modal;

function close_modal() {
    modal_background.style.display = "none";
}

function cancel() {
    console.log("payment canceled");
    clearInterval(interval_id);
    close_modal();
}

async function finish() {
    modal_payment.style.display = "none";
    modal_success.style.display = "block";
}

async function poll_complete(order_id) {
    let order_status = await fetch(`https://${merchant}/instances/default/private/orders/${order_id}`, {
        headers: {
        'Authorization': `Bearer secret-token:${auth_token}`,
        }
    })
    .then(response => response.json())
    .then(data => {
        return data.order_status;
    });

    if (order_status === "paid") {
        console.log("payment confirmed");
        clearInterval(interval_id);
        finish();
    }
}

async function pay(data) {
    let payment_url = `taler://pay/${merchant}/${data.order_id}/?c=${data.token}`;
    console.log("pay at: ", payment_url);

    let payment_href = document.getElementById("payment-url");
    payment_href.text = payment_url;
    payment_href.href = payment_url;

    modal_background.style.display = "block";
    modal_payment.style.display = "block";

    let cancelbutton = document.getElementById("cancel-button");
    cancelbutton.onclick = cancel;

    let qr = document.getElementById("qr");
    qr.innerHTML = "";
    new QRCode(qr, {
        text: payment_url,
        width: 256,
        height: 256,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

    interval_id = setInterval(poll_complete, 250, data.order_id);
}

function buy(text, amount) {
    let body = `{"order":{"amount":"${currency}:${amount}","summary":"${text}","products":[],"extra":"","wire_fee_amortization":1,"max_fee":"${currency}:1","max_wire_fee":"${currency}:1"},"inventory_products":[],"create_token":true}`

    fetch(`https://${merchant}/instances/default/private/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer secret-token:${auth_token}`,
        },
        body: body,
    })
    .then(response => response.json())
    .then(data => {
        pay(data);
    })
    .catch(error => {
        console.log(error);
    });
}