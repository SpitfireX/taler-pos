const sleep = ms => new Promise(r => setTimeout(r, ms));

function close_modal() {
    let modal = document.getElementById("payment-modal");
    modal.style.display = "none";
}

async function finish() {
    let modalcontent = document.getElementById("payment-modal-content");
    modalcontent.innerHTML = '<div class="check" onclick="close_modal()"></div>'

}

async function poll_complete(order_id) {
    for (let i = 0; i < 240; i++) {
        let order_status = await fetch(`https://merchant.taler.windfis.ch/instances/default/private/orders/${order_id}`, {
            headers: {
            'Authorization': 'Bearer secret-token:y9jgHGtLzA6PSyPcId2n',
            }
        })
        .then(response => response.json())
        .then(data => {
            return data.order_status;
        });

        if (order_status === "paid") {
            console.log("payment confirmed");5.00
            finish();
            break;
        } else {
            await sleep(250);
        }
    }
}

async function pay(data) {
    let payment_url = `taler://pay/merchant.taler.windfis.ch/${data.order_id}/?c=${data.token}`;
    console.log("pay at: ", payment_url);

    let modal = document.getElementById("payment-modal");
    modal.style.display = "block";

    let modalcontent = document.getElementById("payment-modal-content");
    modalcontent.innerHTML = `</div><div id="qr"></div><p>Pay at the following URL: <u>${payment_url}</u></p><div class="loader"></div><div class="cancel-button">Cancel</div>`;

    new QRCode(document.getElementById("qr"), {
        text: payment_url,
        width: 256,
        height: 256,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

    poll_complete(data.order_id)
}

function buy(text, amount) {
    let body = `{"order":{"amount":"MANA:${amount}","summary":"${text}","products":[],"extra":"","wire_fee_amortization":1,"max_fee":"MANA:1","max_wire_fee":"MANA:1"},"inventory_products":[],"create_token":true}`

    fetch("https://merchant.taler.windfis.ch/instances/default/private/orders", {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer secret-token:y9jgHGtLzA6PSyPcId2n',
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