const fs = require('fs');
let content = fs.readFileSync('backend/routes/authRoutes.js', 'utf8');

// Replace city: user.city with wishlist included
// Using regex to replace all instances in the /me and /login endpoints
content = content.replace(/city: user\.city,/g, 'city: user.city,\n          wishlist: user.wishlist || [],');

const endpointCode = `
// ── POST /api/auth/wishlist ──────────────────────────────
router.post('/wishlist', verifyCustomerToken, async (req, res, next) => {
  try {
    const { hotelId } = req.body;
    if (!hotelId) return res.status(400).json({ success: false, message: 'Hotel ID is required.' });
    const user = await User.findById(req.customer.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    let updatedWishlist = user.wishlist || [];
    if (updatedWishlist.includes(hotelId)) {
      updatedWishlist = updatedWishlist.filter(id => id !== hotelId);
    } else {
      updatedWishlist.push(hotelId);
    }
    user.wishlist = updatedWishlist;
    await user.save();
    res.json({ success: true, data: user.wishlist });
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/profile`;

content = content.replace(/\/\/ ── PATCH \/api\/auth\/profile/g, endpointCode);

fs.writeFileSync('backend/routes/authRoutes.js', content, 'utf8');
console.log('Done patching authRoutes.js');
