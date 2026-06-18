const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: "rzp_test_ShdXO3jUllvP9o",
  key_secret: "A1P4poGDP9EH0yzVbPArNnxd"
});

razorpay.orders.create({
  amount: 100 * 100,
  currency: "INR",
  receipt: "receipt_1"
}).then(order => {
  console.log("SUCCESS:", order);
}).catch(err => {
  console.error("FAILED:", err);
});
