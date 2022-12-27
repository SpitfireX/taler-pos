const sleep = ms => new Promise(r => setTimeout(r, ms));
var interval_id;

var merchant = null;
var instance = null;
var auth_token = null;
var currency = null;

const modal_background = document.getElementById("modal");
const modal_payment = document.getElementById("modal-content-payment");
const modal_success = document.getElementById("modal-content-success");
modal_success.onclick = close_modal;

function close_modal() {
    modal_background.style.display = "none";
}

function cancel(order_id) {
    close_modal();
    clearInterval(interval_id);

    fetch(`https://${merchant}/instances/${instance}/private/orders/${order_id}`, {
        method: "DELETE",
        headers: {
            'Authorization': `Bearer secret-token:${auth_token}`,
        }
    })
    .then(response => {
        if (response.status !== 204)
            display_notification(`Warning: Could not delete order ${order_id} in backend, response code ${response.status}`, "warning");
    })
    .catch(error => {
        display_notification(`Error when deleting order ${order_id} in backend: ${error}`, "error");
    });

    console.log(`order ${order_id} canceled`);
}

async function finish() {
    modal_payment.style.display = "none";
    modal_success.style.display = "block";
}

async function poll_complete(order_id) {
    let order_status = await fetch(`https://${merchant}/instances/${instance}/private/orders/${order_id}`, {
        headers: {
        'Authorization': `Bearer secret-token:${auth_token}`,
        }
    })
    .then(response => response.json())
    .then(data => {
        return data.order_status;
    })
    .catch(error => {
        display_notification("Error when polling for incoming payment: " + error, "error");
    });

    if (order_status === "paid") {
        console.log("payment confirmed");
        clearInterval(interval_id);
        finish();
    }
}

async function pay(data) {
    let payment_url = `taler://pay/${merchant}/instances/${instance}/${data.order_id}/?c=${data.token}`;
    console.log("pay at: ", payment_url);

    let payment_href = document.getElementById("payment-url");
    payment_href.text = payment_url;
    payment_href.href = payment_url;

    modal_background.style.display = "block";
    modal_payment.style.display = "block";

    let cancelbutton = document.getElementById("cancel-button");
    cancelbutton.onclick = () => cancel(data.order_id);

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

    fetch(`https://${merchant}/instances/${instance}/private/orders`, {
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
        display_notification("Error when initializing payment: " + error, "error");
    });
}

function display_notification(text, style="") {
    let area = document.getElementById("notifications");

    let notification = document.createElement("div");
    notification.className = "notification " + style;
    notification.textContent = text;

    notification.onclick = () => {
        notification.remove();
    };

    area.appendChild(notification);
}

async function configure() {
    if (document.getElementById("config-form").checkValidity()) {
        let url = document.getElementById("config-posurl").value;
        let remember = document.getElementById("config-remember").checked;
        
        if (remember)
            window.localStorage.setItem("pos_url", url);

        load_pos_config(url);
    }
}

async function load_pos_config(url) {
    let pos_config = await fetch(url)
        .then(response => response.json())
        .catch(error => {
            display_notification(`Error when fetching JSON: ${error} Is your URL correct?`, "error");
            window.localStorage.clear("pos_url"); //delete value so config gets reset
        });

    if (pos_config !== null) {
        build_pos(pos_config);
    } else {
        display_notification(`Error when loading JSON config from ${url}, data was null.`, "error");
        window.localStorage.clear("pos_url"); //delete value so config gets reset
    }
}

function build_pos(pos_config) {
    // extract static config info from json payload
    let url = pos_config.config.base_url;
    [,merchant,instance] = url.match(/https:\/\/(.+)\/instances\/(.+)\/?/);
    
    auth_token = pos_config.config.api_key.split(':')[1];
    
    currency = pos_config.products[0].price.split(':')[0];
    
    // products can be in multiple categories, thus a map
    let categories = new Map();
    for (const c of pos_config.categories) {
        categories.set(c.id, {"name": c.name, "products": []});
    }

    for (const p of pos_config.products) {
        for (const c of p.categories) {
            categories.get(c)["products"].push(p);
        }
    }

    // build dom

    let pos = document.getElementById("pos");

    for (let [i, c] of categories) {
        let heading = document.createElement("h2");
        heading.textContent = c.name;
        pos.appendChild(heading);

        let buttons = document.createElement("div");
        buttons.className = "buttons";
        pos.appendChild(buttons);

        for (const p of c.products) {
            let button = document.createElement("div");
            button.className = "button";
            button.textContent = p.description;
            button.onclick = () => buy(p.description, p.price.split(':')[1]);

            buttons.appendChild(button);
        }
    }

    // make stuff visible
    document.getElementById("config").style.display = "none";
    pos.style.display = "block";
}

// skip config view when there is a saved config
if (window.localStorage.getItem("pos_url")){
    load_pos_config(window.localStorage.getItem("pos_url"));
} else {
    // make config view visible
    document.getElementById("config").style.display = "flex";
    // only add event handler for config form when needed
    document.getElementById("config-submit").onclick = configure;
}
