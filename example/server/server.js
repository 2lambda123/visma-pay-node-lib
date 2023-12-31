// Express package is required for this example
const express = require('express');
const app = express();

const vismaPay = require("../../lib/vismapay.js");
const helpers = require("../helpers/common");

// Set private key and api key
vismaPay.setPrivateKey(process.env.VISMAPAY_PRIVATE_KEY || '');
vismaPay.setApiKey(process.env.VISMAPAY_API_KEY || '');

let orderCounter = 1;

console.log('dn', __dirname);
app.use('/', express.static(__dirname + '/../public'));

app.get('/create-charge/:selected?', function(req, res) {
	const selected = typeof req.params.selected !== 'undefined' ? req.params.selected : null;

	const chargeObject = {
		amount: 100,
		order_number: 'test-order-' + (orderCounter++) + '-' + new Date().getTime(), // Order number shall be unique for every order
		currency: 'EUR',
		payment_method: {
			type: 'e-payment',
			return_url: req.protocol + '://' + req.get('host') + '/e-payment-return',
			notify_url: req.protocol + '://' + req.get('host') + '/e-payment-notify',
			lang: 'en'
		},
		customer: { // Optional customer details

			// All fields are optional
			firstname: 'Test',
			lastname: 'Person',
			email: 'testperson@test.fi',
			address_street: 'Testaddress 1',
			address_city: 'Testlandia',
			address_zip: '12345'
		},
		products: [{ // Optional product fields

				// All fields required
				id: 'test-product-1',
				title: 'Test Product 1',
				count: 1,
				pretax_price: 50,
				tax: 0,
				price: 50, // Product prices must match with the total amount
				type: 1
			},
			{
				id: 'test-product-2',
				title: 'Test Product 2',
				count: 1,
				pretax_price: 50,
				tax: 0,
				price: 50,
				type: 1
			}
		]
	};

	if(selected)
		chargeObject.payment_method.selected = [selected];

	vismaPay.createCharge(chargeObject)
	.then(result => {
		console.log('createCharge response:', result);
		let token = '';
		if(result.result == 0) {
			console.log("Got token = " + result.token + " for charge = " + chargeObject.order_number);
			token = result.token;
		}

		if(token !== "") {
			res.redirect(vismaPay.apiUrl + '/token/' + token);
		} else {
			res.status(500);
			res.end('Something went wrong when creating a charge.');
		}
	})
	.catch(err => {
		console.error(err);
		res.status(500);
		res.end('Something went wrong when creating a charge.');
	})
});

app.get('/e-payment-return', async function(req, res) {
	console.log('E-payment return, params:', req.query);

	try {
		const result = await vismaPay.checkReturn(req.query);

		if (req.query.RETURN_CODE === '0') {
			console.log('OK result:', result);
			res.status(200);
			res.end(`<html><body><p>Payment was successful for order number: ${req.query.ORDER_NUMBER}</p><a href="/">Start again</a></body></html>`);
		}
		else {
			res.status(500);
			const errorMessage = helpers.getErrorMessageFromReturnCode(req.query.RETURN_CODE);
			console.error(errorMessage);
			res.end(`<html><body><p></p>${errorMessage}</p><a href="/">Start again</a></body></html>`);
		}
	} catch (error) {
		console.error(error);
		res.status(500);
		res.end(`<html><body><p>${error.errCode2Text(error.type)}</p><a href="/">Start again</a></body></html>`);
	}
});

app.get('/e-payment-notify', function(req, res) {
	console.log('Got notify, params:', req.query);

	vismaPay.checkReturn(req.query)
	.then(ok => {
		console.log('Got successful result:', ok);
	})
	.catch(err => {
		console.error('Got error result:', err);
	})
	.finally(() => {
		res.end('');
	});
});

app.get('/get-merchant-payment-methods', function(req, res) {
	vismaPay.getMerchantPaymentMethods('EUR')
	.then(result => {
		console.log('Payment methods result:', result);
		res.end(JSON.stringify(result.payment_methods));
	})
	.catch(err => {
		console.error(err);
		res.status(500);
		res.end('');
	});
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
