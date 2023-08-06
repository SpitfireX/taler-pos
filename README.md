# Taler POS

![](screenshot.png)

A point of sale (POS) webapp for GNU Taler

## Setup

`git clone --recursive https://github.com/SpitfireX/taler-pos /var/www/whatever` and have your favourite
web server serve these files.

Then, serve one (or more) [GNU Taler merchant POS configuration](https://docs.taler.net/taler-merchant-pos-terminal.html#apis-and-data-formats) JSON files. An example file could look like this:

```json
{
    "config": {
        "base_url": "https://merchant-backend.example.org/instances/foobar",
        "base_url_lite": "https://merchant-backend-lite.example.org/instances/foobar",
        "api_key": "secret-token:verysecretstuff23"
    },
    "categories": [
        { "id": 1, "name": "Food" }
    ],
    "products": [
        {
            "product_id": "1",
            "description": "Pizza",
            "price": "KUDOS:13.37",
            "categories": [1],
            "delivery_location": "mylocation"
        }
    ],
    "locations": {
        "mylocation": {
            "name": "Food desk",
            "country": "Germany",
            "state": "",
            "region": "",
            "province": "",
            "city": "Somewhere",
            "zip_code": "",
            "street": "",
            "street_number": ""
        }
    }
}
```

The `base_url_lite` key is optional, see "Security considerations" below.

## Security considerations

Note that the `pos.json` files are available to anyone who can access the POS terminal, and that they contain
your merchant secret token can be used to change any setting of the merchant instance. Namely, it can be used
to change the payment method (destination IBAN) to an attacker's account.

To remedy this, you can use a reverse proxy which hides the "real" access token internally, and only allows
access to very specific order management endpoints using a less secret token which is exposed as described
above. In this case, point `base_url` to the actual merchant backend, and `base_url_lite` to this proxy.
Use the less secret token as `api_key`. (The POS terminal will make all requests against `base_url_lite`.
However, it will instruct wallets to execute payments against `base_url`, the real backend.)

## Attributions

This repo contains the file `Eo_circle_green_checkmark.svg` licensed under CC BY-SA 4.0, derived from Emoji One, original at [https://commons.wikimedia.org/wiki/File:Eo_circle_green_checkmark.svg](https://commons.wikimedia.org/wiki/File:Eo_circle_green_checkmark.svg)
