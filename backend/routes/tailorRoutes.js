import express from 'express';
import Tailor from '../models/tailors.js';

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/tailors/search
// Query params: lat (float), lng (float), type ('light'|'heavy')
// Returns up to 20 nearest tailors annotated with ETA
// NOTE: route must be declared BEFORE /:id to avoid 'search' matching as an ObjectId
// ─────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const { lat, lng, type } = req.query;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ message: 'lat and lng query params are required and must be numbers' });
    }

    const workType = type === 'heavy' ? 'heavy' : 'light';
    const avgField = workType === 'heavy' ? '$services.heavyAvgMins' : '$services.lightAvgMins';

    const point = { type: 'Point', coordinates: [parsedLng, parsedLat] };

    const tailors = await Tailor.aggregate([
      {
        $geoNear: {
          near: point,
          distanceField: 'dist.calculated',
          spherical: true,
          limit: 20
        }
      },
      {
        $addFields: {
          avgTime: { $ifNull: [avgField, 60] }
        }
      },
      {
        $project: {
          name: 1,
          shopPhotoUrl: 1,
          address: 1,
          isAvailable: 1,
          currentOrders: 1,
          waitingListCount: 1,
          rating: 1,
          priceFrom: 1,
          'services.labels': 1,
          avgTime: 1,
          distanceMeters: '$dist.calculated',
          estimatedMinutes: {
            $add: [
              { $multiply: [{ $ifNull: ['$waitingListCount', 0] }, { $ifNull: [avgField, 60] }] },
              { $ifNull: [avgField, 60] }
            ]
          }
        }
      }
    ]);

    res.json(tailors);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────
// GET /api/tailors/:id
// Returns full tailor profile
// ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const tailor = await Tailor.findById(req.params.id);
    if (!tailor) return res.status(404).json({ message: 'Tailor not found' });
    res.json(tailor);
  } catch (err) {
    next(err);
  }
});

export default router;
